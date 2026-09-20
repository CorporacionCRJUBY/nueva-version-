// FILE: backend/tests/unit/pagination.middleware.test.js
//
// Regresión de la bitácora del 2026-09-15: las rutas GET no pasan por
// `validate`, así que el límite de pageSize de los validadores nunca se
// aplicaba y `?pageSize=999999` habría volcado la tabla completa.

const { clampPagination, MAX_PAGE_SIZE } = require('../../src/middleware/pagination.middleware');

function run(query, method = 'GET') {
  const req = { method, query, originalUrl: '/api/students' };
  let called = false;
  clampPagination(req, {}, () => {
    called = true;
  });
  expect(called).toBe(true);
  return req.query;
}

describe('clampPagination middleware', () => {
  it('recorta un pageSize desmedido al máximo', () => {
    expect(run({ pageSize: '999999' }).pageSize).toBe(MAX_PAGE_SIZE);
  });

  it('respeta el pageSize=1000 que usan los selectores', () => {
    expect(run({ pageSize: '1000' }).pageSize).toBe(1000);
  });

  it('deja intactas las páginas normales', () => {
    expect(run({ page: '2', pageSize: '10' })).toEqual({ page: 2, pageSize: 10 });
  });

  it('evita el OFFSET negativo', () => {
    expect(run({ page: '-5', pageSize: '10' }).page).toBe(1);
    expect(run({ page: '0', pageSize: '10' }).page).toBe(1);
  });

  it('sustituye la basura por el valor por defecto', () => {
    expect(run({ pageSize: 'abc' }).pageSize).toBe(20);
  });

  it('también acota limit', () => {
    expect(run({ limit: '50000' }).limit).toBe(MAX_PAGE_SIZE);
  });

  it('no toca las escrituras ni los GET sin paginación', () => {
    expect(run({ pageSize: '999999' }, 'POST').pageSize).toBe('999999');
    expect(run({ search: 'lópez' })).toEqual({ search: 'lópez' });
  });
});
