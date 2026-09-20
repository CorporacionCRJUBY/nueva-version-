'use strict';

/**
 * Tests unitarios de src/services/gpa.service.js.
 *
 * Cubre tres regresiones encontradas al escribir estos tests (ninguna se
 * ejercitaba antes por falta de cobertura de este servicio):
 *
 *  1. create()/update(): un `grade_value: null` explícito en el payload
 *     pasaba el chequeo `!== undefined` y se derivaba un gpa_value de 0.0
 *     en silencio (Number(null) === 0 coincide con el umbral 0 de la
 *     tabla de GPA). Ahora se ignora, igual que si no se hubiera enviado.
 *  2. recalculate()/getCumulative(): un registro de GPA en estado PENDING
 *     sin gpa_value calculado todavía (null/undefined) se multiplicaba
 *     por sus créditos (null * credit_hours === 0 en JS) y esos créditos
 *     SÍ se sumaban al total, arrastrando el GPA acumulado hacia abajo.
 *     Ahora esos registros se excluyen por completo del cálculo.
 */

jest.mock('../../src/repositories/gpa.repository');
jest.mock('../../src/repositories/students.repository');
jest.mock('../../src/repositories/settings.repository');
jest.mock('../../src/services/audit.service');
jest.mock('../../src/utils/codeGenerator');

const repository = require('../../src/repositories/gpa.repository');
const studentsRepository = require('../../src/repositories/students.repository');
const settingsRepository = require('../../src/repositories/settings.repository');
const auditService = require('../../src/services/audit.service');
const { generateCode } = require('../../src/utils/codeGenerator');
const GPAService = require('../../src/services/gpa.service');

const user = { id: 7, roles: ['teacher'], branches: [1] };

beforeEach(() => {
  jest.resetAllMocks();
  generateCode.mockResolvedValue('GPA-0001');
  auditService.log.mockResolvedValue(undefined);
  settingsRepository.getByKey.mockResolvedValue(null); // usa escala 4.0 por defecto
  studentsRepository.findById.mockResolvedValue({ id: 5, branch_id: 1 });
});

describe('create()', () => {
  test('deriva gpa_value desde grade_value cuando no viene gpa_value explícito', async () => {
    repository.create.mockResolvedValue([1]);
    repository.findById.mockResolvedValue({ id: 1, gpa_value: 4.0 });

    await GPAService.create({ student_id: 5, grade_value: 92 }, user, {});

    const dataSent = repository.create.mock.calls[0][0];
    expect(dataSent.gpa_value).toBe(4.0); // 92 -> 4.0 en la tabla por defecto
    expect(dataSent).not.toHaveProperty('grade_value');
  });

  test('REGRESIÓN: grade_value: null explícito NO debe derivar gpa_value 0', async () => {
    repository.create.mockResolvedValue([1]);
    repository.findById.mockResolvedValue({ id: 1, gpa_value: undefined });

    await GPAService.create({ student_id: 5, grade_value: null }, user, {});

    const dataSent = repository.create.mock.calls[0][0];
    // Antes del fix esto era 0 (Number(null) === 0). Debe quedar sin definir,
    // no en cero -- un cero real reprobaría al estudiante en cálculos aguas
    // abajo que sí se hicieron con una nota real.
    expect(dataSent.gpa_value).toBeUndefined();
  });

  test('respeta un gpa_value explícito aunque también venga grade_value', async () => {
    repository.create.mockResolvedValue([1]);
    repository.findById.mockResolvedValue({ id: 1, gpa_value: 3.5 });

    await GPAService.create({ student_id: 5, gpa_value: 3.5, grade_value: 60 }, user, {});

    const dataSent = repository.create.mock.calls[0][0];
    expect(dataSent.gpa_value).toBe(3.5);
  });
});

describe('update()', () => {
  test('REGRESIÓN: grade_value: null explícito no debe pisar un gpa_value existente con 0', async () => {
    repository.findById
      .mockResolvedValueOnce({ id: 1, branch_id: 1, code: 'GPA-0001', gpa_value: 3.0 })
      .mockResolvedValueOnce({ id: 1, gpa_value: 3.0 });

    await GPAService.update(1, { grade_value: null }, user, {});

    const [, updatePayload] = repository.update.mock.calls[0];
    expect(updatePayload.gpa_value).toBeUndefined();
  });
});

describe('recalculate()', () => {
  test('REGRESIÓN: un registro PENDING sin gpa_value no debe contar como GPA 0', async () => {
    repository.findByStudent.mockResolvedValue([
      { gpa_value: 4.0, credit_hours: 3 },
      { gpa_value: null, credit_hours: 3, status: 'PENDING' }, // aún sin calcular
    ]);

    const result = await GPAService.recalculate(5, user);

    // Si el registro PENDING contara como 0: (4*3 + 0*3)/(3+3) = 2.0
    // Correcto: solo cuenta el registro con nota real -> (4*3)/3 = 4.0
    expect(result.cumulativeGPA).toBe(4.0);
  });

  test('sin registros con gpa_value calculado, el GPA acumulado es 0 (no NaN)', async () => {
    repository.findByStudent.mockResolvedValue([{ gpa_value: null, credit_hours: 3 }]);
    const result = await GPAService.recalculate(5, user);
    expect(result.cumulativeGPA).toBe(0);
  });
});

describe('getCumulative()', () => {
  test('REGRESIÓN: excluye registros sin gpa_value del promedio ponderado por créditos', async () => {
    repository.findByStudent.mockResolvedValue([
      { gpa_value: 3.0, credit_hours: 4 },
      { gpa_value: undefined, credit_hours: 10 }, // no debe arrastrar el promedio
    ]);

    const result = await GPAService.getCumulative(5, user);

    expect(result.cumulativeGPA).toBe(3.0);
    expect(result.totalCredits).toBe(4); // los créditos del registro sin nota tampoco cuentan
  });
});
