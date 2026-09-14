'use strict';

/**
 * Tests unitarios de src/services/gradeChangeRequests.service.js.
 *
 * Se mockean el repositorio, la BD (transacción), auditService y el
 * repositorio de estudiantes, para probar la lógica de negocio del flujo
 * de aprobación de cambios de nota sin necesitar MySQL real:
 *
 *  - approve(): mueve PENDING -> APPROVED, escribe grade_history y
 *    actualiza grade_records con la letra recalculada, dentro de una
 *    transacción.
 *  - reject(): mueve PENDING -> REJECTED sin tocar grade_records.
 *  - Regresión del hallazgo alto #1 (bypass del flujo de aprobación):
 *    update() NUNCA debe poder escribir status/reviewed_by/reviewed_at/
 *    review_notes, aunque el payload los incluya explícitamente.
 *  - Aislamiento por sede (C1): las operaciones sobre una solicitud de
 *    otra sede deben fallar con 404, no con 403 (no revelar existencia).
 */

jest.mock('../../src/config/database');
jest.mock('../../src/repositories/gradeChangeRequests.repository');
jest.mock('../../src/repositories/students.repository');
jest.mock('../../src/services/audit.service');
jest.mock('../../src/utils/codeGenerator');

const db = require('../../src/config/database');
const repository = require('../../src/repositories/gradeChangeRequests.repository');
const studentsRepository = require('../../src/repositories/students.repository');
const auditService = require('../../src/services/audit.service');
const { generateCode } = require('../../src/utils/codeGenerator');
const AppError = require('../../src/utils/AppError');
const GradeChangeRequestsService = require('../../src/services/gradeChangeRequests.service');

// Usuario de una sede normal (no SUPER_ADMIN), con acceso solo a la sede 1.
const user = { id: 42, roles: ['teacher'], branches: [1] };

function buildTrxMock({ gradeRecord } = {}) {
  const calls = { update: [], insert: [] };
  const trx = jest.fn((table) => {
    if (table === 'grade_change_requests') {
      return {
        where: () => ({
          update: (data) => {
            calls.update.push({ table, data });
            return Promise.resolve(1);
          },
        }),
      };
    }
    if (table === 'grade_records') {
      return {
        where: () => ({
          first: () => Promise.resolve(gradeRecord || null),
          update: (data) => {
            calls.update.push({ table, data });
            return Promise.resolve(1);
          },
        }),
      };
    }
    if (table === 'grade_history') {
      return {
        insert: (data) => {
          calls.insert.push({ table, data });
          return Promise.resolve([1]);
        },
      };
    }
    throw new Error(`tabla inesperada en la transacción de test: ${table}`);
  });
  trx.fn = { now: () => 'NOW()' };
  trx.__calls = calls;
  return trx;
}

beforeEach(() => {
  jest.resetAllMocks();
  generateCode.mockResolvedValue('REQ-0001');
  auditService.log.mockResolvedValue(undefined);
});

describe('create()', () => {
  test('valida acceso por sede al estudiante antes de crear', async () => {
    studentsRepository.findById.mockResolvedValue({ id: 5, branch_id: 1 });
    repository.create.mockResolvedValue([10]);
    repository.findById.mockResolvedValue({ id: 10, code: 'REQ-0001', status: 'PENDING' });

    const result = await GradeChangeRequestsService.create(
      { student_id: 5, grade_record_id: 3, requested_grade: 88, reason: 'Recalculo' },
      user,
      {}
    );

    expect(studentsRepository.findById).toHaveBeenCalledWith(5);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PENDING', requested_by: user.id, code: 'REQ-0001' })
    );
    expect(result.status).toBe('PENDING');
  });

  test('rechaza con 404 si el estudiante pertenece a otra sede', async () => {
    studentsRepository.findById.mockResolvedValue({ id: 5, branch_id: 99 }); // sede ajena
    await expect(
      GradeChangeRequestsService.create({ student_id: 5 }, user, {})
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(repository.create).not.toHaveBeenCalled();
  });

  test('rechaza si falta student_id', async () => {
    await expect(GradeChangeRequestsService.create({}, user, {})).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe('update() — regresión del bypass del flujo de aprobación', () => {
  const pending = { id: 10, code: 'REQ-0001', status: 'PENDING', branch_id: 1, student_id: 5 };

  test('ignora status/reviewed_by/reviewed_at/review_notes aunque vengan en el payload', async () => {
    repository.findById.mockResolvedValueOnce(pending).mockResolvedValueOnce({
      ...pending,
      reason: 'Nuevo motivo',
    });

    await GradeChangeRequestsService.update(
      10,
      {
        reason: 'Nuevo motivo',
        status: 'APPROVED', // intento de bypass
        reviewed_by: 999,
        reviewed_at: '2026-01-01',
        review_notes: 'auto-aprobado',
      },
      user,
      {}
    );

    expect(repository.update).toHaveBeenCalledTimes(1);
    const [, payloadSent] = repository.update.mock.calls[0];
    expect(payloadSent).not.toHaveProperty('status');
    expect(payloadSent).not.toHaveProperty('reviewed_by');
    expect(payloadSent).not.toHaveProperty('reviewed_at');
    expect(payloadSent).not.toHaveProperty('review_notes');
    expect(payloadSent).toEqual(expect.objectContaining({ reason: 'Nuevo motivo' }));
  });

  test('rechaza actualizar una solicitud que ya no está PENDING', async () => {
    repository.findById.mockResolvedValue({ ...pending, status: 'APPROVED' });
    await expect(
      GradeChangeRequestsService.update(10, { reason: 'x' }, user, {})
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(repository.update).not.toHaveBeenCalled();
  });

  test('rechaza con 404 si la solicitud pertenece a otra sede', async () => {
    repository.findById.mockResolvedValue({ ...pending, branch_id: 99 });
    await expect(
      GradeChangeRequestsService.update(10, { reason: 'x' }, user, {})
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('approve()', () => {
  const pending = {
    id: 10,
    code: 'REQ-0001',
    status: 'PENDING',
    branch_id: 1,
    student_id: 5,
    grade_record_id: 3,
    requested_grade: 92,
    reason: 'Recalculo de examen final',
  };

  test('actualiza status, escribe grade_history y actualiza grade_records con la letra recalculada', async () => {
    const gradeRecord = { id: 3, grade_value: 78, grade_letter: 'C' };
    const trx = buildTrxMock({ gradeRecord });
    db.transaction.mockImplementation(async (cb) => cb(trx));

    repository.findById
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce({ ...pending, status: 'APPROVED' });

    const result = await GradeChangeRequestsService.approve(10, { notes: 'ok' }, user, {});

    expect(db.transaction).toHaveBeenCalledTimes(1);

    const reqUpdate = trx.__calls.update.find((c) => c.table === 'grade_change_requests');
    expect(reqUpdate.data).toMatchObject({ status: 'APPROVED', reviewed_by: user.id, review_notes: 'ok' });

    const historyInsert = trx.__calls.insert.find((c) => c.table === 'grade_history');
    expect(historyInsert.data).toMatchObject({
      grade_record_id: 3,
      from_grade: 78,
      to_grade: 92,
      from_letter: 'C',
      to_letter: 'A', // 92 -> letra A según convertToLetterGrade
      changed_by: user.id,
    });

    const gradeUpdate = trx.__calls.update.find((c) => c.table === 'grade_records');
    expect(gradeUpdate.data).toMatchObject({ grade_value: 92, grade_letter: 'A', status: 'UNLOCKED' });

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'APPROVE', module: 'grade-change-requests' })
    );
    expect(result.status).toBe('APPROVED');
  });

  test('no toca grade_records si el registro de calificación original ya no existe', async () => {
    const trx = buildTrxMock({ gradeRecord: null });
    db.transaction.mockImplementation(async (cb) => cb(trx));
    repository.findById.mockResolvedValueOnce(pending).mockResolvedValueOnce({ ...pending, status: 'APPROVED' });

    await GradeChangeRequestsService.approve(10, {}, user, {});

    expect(trx.__calls.insert.find((c) => c.table === 'grade_history')).toBeUndefined();
    expect(trx.__calls.update.find((c) => c.table === 'grade_records')).toBeUndefined();
  });

  test('rechaza aprobar una solicitud que no está PENDING', async () => {
    repository.findById.mockResolvedValue({ ...pending, status: 'REJECTED' });
    await expect(GradeChangeRequestsService.approve(10, {}, user, {})).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  test('rechaza con 404 si la solicitud pertenece a otra sede', async () => {
    repository.findById.mockResolvedValue({ ...pending, branch_id: 99 });
    await expect(GradeChangeRequestsService.approve(10, {}, user, {})).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(db.transaction).not.toHaveBeenCalled();
  });
});

describe('reject()', () => {
  const pending = { id: 10, code: 'REQ-0001', status: 'PENDING', branch_id: 1 };

  test('rechaza la solicitud sin tocar grade_records', async () => {
    repository.findById
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce({ ...pending, status: 'REJECTED', review_notes: 'no aplica' });
    repository.reject.mockResolvedValue(1);

    const result = await GradeChangeRequestsService.reject(10, { notes: 'no aplica' }, user, {});

    expect(repository.reject).toHaveBeenCalledWith(10, user.id, 'no aplica');
    expect(db.transaction).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'REJECT' }));
    expect(result.status).toBe('REJECTED');
  });

  test('rechaza rechazar una solicitud que no está PENDING', async () => {
    repository.findById.mockResolvedValue({ ...pending, status: 'APPROVED' });
    await expect(GradeChangeRequestsService.reject(10, {}, user, {})).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(repository.reject).not.toHaveBeenCalled();
  });
});
