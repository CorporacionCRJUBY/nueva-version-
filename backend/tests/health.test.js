'use strict';

// Tests de los endpoints de health check y de la validación estricta de env.
// No requieren base de datos: /health/live responde sin BD; /health/ready
// devuelve 503 si la BD no está disponible (que es el caso en CI sin MySQL).

const request = require('supertest');

describe('health endpoints', () => {
  let app;

  beforeAll(() => {
    // Cargar la app (no arranca el servidor, solo expone el router Express)
    app = require('../src/app');
  });

  test('GET / responde con la API activa', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('ACADEMIX');
  });

  test('GET /health/live responde ok con uptime', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });

  test('GET /health/ready responde 200 o 503 según BD', async () => {
    const res = await request(app).get('/health/ready');
    // Sin BD disponible devuelve 503; con BD devuelve 200. Ambos son válidos
    // para el contrato del endpoint.
    expect([200, 503]).toContain(res.status);
    expect(res.body.success).toBeDefined();
  });

  test('GET /ruta-inexistente devuelve 404 JSON', async () => {
    const res = await request(app).get('/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('config/env validación', () => {
  test('expone los valores por defecto en desarrollo', () => {
    const env = require('../src/config/env');
    expect(env.PORT).toBeGreaterThan(0);
    expect(env.DB_NAME).toBeTruthy();
    expect(env.JSON_BODY_LIMIT).toBeTruthy();
    expect(env.SHUTDOWN_TIMEOUT_MS).toBeGreaterThan(0);
  });

  test('convierte booleanos correctamente', () => {
    const env = require('../src/config/env');
    expect(typeof env.TWO_FACTOR_ENABLED).toBe('boolean');
  });

  test('TRUST_PROXY es un NUMERO DE SALTOS, nunca un booleano', () => {
    // SEGURIDAD: con `trust proxy: true` Express acepta la IP que declare el
    // cliente en X-Forwarded-For, de modo que cada peticion puede venir de una
    // IP distinta y los limites por IP dejan de aplicarse. Debe ser un entero
    // >= 0 (0 = expuesto directamente, 1 = un reverse-proxy delante).
    const env = require('../src/config/env');
    expect(typeof env.TRUST_PROXY).toBe('number');
    expect(Number.isInteger(env.TRUST_PROXY)).toBe(true);
    expect(env.TRUST_PROXY).toBeGreaterThanOrEqual(0);
  });
});