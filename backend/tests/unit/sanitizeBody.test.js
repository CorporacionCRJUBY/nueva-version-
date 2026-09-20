// FILE: backend/tests/unit/sanitizeBody.test.js
//
// Regresión de la bitácora del 2026-09-15: una tanda de 400 "Validation
// failed" (medical-records, graduation, attendance, grades, academic-periods)
// venía de campos opcionales enviados como cadena vacía. El sanitizador los
// convierte en null para que `optional({ values: 'null' })` los salte.

const { sanitizeBody, normalizeValue } = require('../../src/middleware/sanitizeBody.middleware');

function run(body) {
  const req = { body };
  let called = false;
  sanitizeBody(req, {}, () => {
    called = true;
  });
  expect(called).toBe(true);
  return req.body;
}

describe('sanitizeBody middleware', () => {
  it('convierte las cadenas vacías en null', () => {
    expect(run({ last_checkup_date: '', notes: '   ' })).toEqual({
      last_checkup_date: null,
      notes: null,
    });
  });

  it('respeta los valores falsy legítimos', () => {
    expect(run({ weight: 0, requirements_met: false, records: [] })).toEqual({
      weight: 0,
      requirements_met: false,
      records: [],
    });
  });

  it('no altera el texto con contenido real', () => {
    expect(run({ first_name: 'María', grade_letter: 'D' })).toEqual({
      first_name: 'María',
      grade_letter: 'D',
    });
  });

  it('entra en objetos y arrays anidados (asistencia diaria)', () => {
    expect(
      run({
        date: '2026-09-15',
        records: [
          { student_id: 3, status: 'P', notes: '' },
          { student_id: 4, status: 'T', notes: 'llegó tarde' },
        ],
      })
    ).toEqual({
      date: '2026-09-15',
      records: [
        { student_id: 3, status: 'P', notes: null },
        { student_id: 4, status: 'T', notes: 'llegó tarde' },
      ],
    });
  });

  it('no falla si no hay body', () => {
    const req = {};
    let called = false;
    sanitizeBody(req, {}, () => {
      called = true;
    });
    expect(called).toBe(true);
  });

  it('deja intactas las fechas y buffers', () => {
    const date = new Date('2026-09-15T00:00:00.000Z');
    const buffer = Buffer.from('x');
    expect(normalizeValue(date, 0)).toBe(date);
    expect(normalizeValue(buffer, 0)).toBe(buffer);
  });
});
