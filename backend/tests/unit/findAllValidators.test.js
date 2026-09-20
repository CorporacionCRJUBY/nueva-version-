// FILE: backend/tests/unit/findAllValidators.test.js
//
// Regresión de la bitácora del 2026-09-15, punto pendiente "la validación de
// query nunca se ejecuta": los bloques `findAll` de los validadores existían
// pero ninguna ruta GET los usaba, así que `pageSize=1000` (que los propios
// selectores del frontend piden a propósito) convivía con un límite de 100
// que jamás se aplicaba. Ahora se conectan y el límite sube a 1000 para no
// romper esos selectores.

const { validationResult } = require('express-validator');
const gradesValidators = require('../../src/validators/grades.validator');
const studentsValidators = require('../../src/validators/students.validator');

async function runFindAll(validators, query) {
  const req = { query, body: {}, params: {} };
  for (const middleware of validators.findAll) {
    await middleware.run(req);
  }
  return validationResult(req);
}

describe('findAll validators (ahora conectados a las rutas)', () => {
  it('acepta pageSize=1000, lo que usan los selectores de formularios', async () => {
    const result = await runFindAll(studentsValidators, { pageSize: '1000' });
    expect(result.isEmpty()).toBe(true);
  });

  it('rechaza un pageSize por encima de 1000', async () => {
    const result = await runFindAll(gradesValidators, { pageSize: '99999' });
    expect(result.isEmpty()).toBe(false);
  });

  it('sigue aceptando una lista paginada normal', async () => {
    const result = await runFindAll(gradesValidators, {
      page: '1',
      pageSize: '10',
      status: 'PUBLISHED',
    });
    expect(result.isEmpty()).toBe(true);
  });

  it('no exige los filtros opcionales que el frontend omite', async () => {
    const result = await runFindAll(studentsValidators, {});
    expect(result.isEmpty()).toBe(true);
  });
});
