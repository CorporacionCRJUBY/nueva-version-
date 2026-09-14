'use strict';

/**
 * Tests unitarios de src/utils/gpaCalculator.js.
 *
 * Es lógica pura (sin BD, sin repositorio), así que se puede probar
 * exhaustivamente sin necesidad de mocks ni de una base de datos real.
 * Cubre: mapeo nota->GPA con la tabla por defecto, promedio ponderado,
 * filtrado de reprobados, honores, y las conversiones usadas por el
 * flujo de aprobación de cambios de nota (letra) y por las tarjetas de
 * boletín (descripción).
 */

const {
  fromScore,
  weightedAverage,
  gpaForStudent,
  honorsStatus,
  gradePointDescription,
  convertToGradePoints,
  convertToLetterGrade,
  DEFAULT_GPA_TABLE,
} = require('../../src/utils/gpaCalculator');

describe('fromScore', () => {
  test('mapea notas exactas de los umbrales de la tabla por defecto', () => {
    expect(fromScore(90)).toBe(4.0);
    expect(fromScore(85)).toBe(3.7);
    expect(fromScore(70)).toBe(2.7);
    expect(fromScore(40)).toBe(1.0);
    expect(fromScore(0)).toBe(0.0);
  });

  test('usa el umbral inmediatamente inferior para notas intermedias', () => {
    expect(fromScore(89)).toBe(3.7); // justo debajo de 90
    expect(fromScore(74)).toBe(2.7); // justo debajo de 75
    expect(fromScore(39)).toBe(0.0); // debajo de 40, cae al umbral 0
  });

  test('nota 100 usa el umbral más alto (90)', () => {
    expect(fromScore(100)).toBe(4.0);
  });

  test('devuelve null para valores no numéricos', () => {
    expect(fromScore('n/a')).toBeNull();
    expect(fromScore(undefined)).toBeNull();
    expect(fromScore(NaN)).toBeNull();
  });

  test('REGRESIÓN: null/"" no deben tratarse como nota 0 (Number(null) === 0)', () => {
    // Antes del fix, fromScore(null) devolvía 0.0 porque Number(null) es 0,
    // que coincide con el umbral más bajo de la tabla. Una nota ausente
    // terminaba computándose como la peor nota posible en vez de excluirse.
    expect(fromScore(null)).toBeNull();
    expect(fromScore('')).toBeNull();
  });

  test('acepta strings numéricos (vienen así de formularios/DB)', () => {
    expect(fromScore('90')).toBe(4.0);
    expect(fromScore('65.0')).toBe(2.3);
  });

  test('acepta una tabla personalizada explícita', () => {
    const table = { 0: 0, 50: 2.0, 100: 5.0 };
    expect(fromScore(100, table)).toBe(5.0);
    expect(fromScore(60, table)).toBe(2.0);
    expect(fromScore(10, table)).toBe(0);
  });
});

describe('weightedAverage', () => {
  test('calcula el promedio ponderado de varias notas', () => {
    // 90 (peso 2) -> 4.0*2=8.0 ; 70 (peso 1) -> 2.7*1=2.7 ; total 10.7/3
    const result = weightedAverage([
      { score: 90, weight: 2 },
      { score: 70, weight: 1 },
    ]);
    expect(result).toBeCloseTo(10.7 / 3, 5);
  });

  test('usa peso 1 por defecto cuando no se especifica', () => {
    const result = weightedAverage([{ score: 90 }, { score: 90 }]);
    expect(result).toBeCloseTo(4.0, 5);
  });

  test('ignora items con peso cero o negativo', () => {
    const result = weightedAverage([
      { score: 90, weight: 1 },
      { score: 0, weight: 0 },
      { score: 0, weight: -5 },
    ]);
    expect(result).toBeCloseTo(4.0, 5);
  });

  test('ignora items malformados (null, no-objeto, score inválido)', () => {
    const result = weightedAverage([null, 'x', { score: 'bad' }, { score: 90, weight: 1 }]);
    expect(result).toBeCloseTo(4.0, 5);
  });

  test('devuelve null si no hay items válidos (evita división por cero)', () => {
    expect(weightedAverage([])).toBeNull();
    expect(weightedAverage([{ score: 'bad' }])).toBeNull();
    expect(weightedAverage([{ score: 90, weight: 0 }])).toBeNull();
  });

  test('REGRESIÓN: un item con score null se excluye, no pesa como nota 0', () => {
    const result = weightedAverage([{ score: 90, weight: 1 }, { score: null, weight: 1 }]);
    expect(result).toBeCloseTo(4.0, 5);
  });

  test('devuelve null si el argumento no es un array', () => {
    expect(weightedAverage(null)).toBeNull();
    expect(weightedAverage({})).toBeNull();
  });
});

describe('gpaForStudent', () => {
  const grades = [
    { score: 95, weight: 1 }, // 4.0
    { score: 55, weight: 1 }, // 1.7 (reprobado según minPassingGpa por defecto en la mayoría de escalas)
    { score: 30, weight: 1 }, // 0.0
  ];

  test('por defecto incluye todas las notas (incluyendo reprobadas)', () => {
    const result = gpaForStudent(grades);
    expect(result).toBeCloseTo((4.0 + 1.7 + 0.0) / 3, 5);
  });

  test('excluye reprobados cuando includeFailed=false y se define minPassingGpa', () => {
    const result = gpaForStudent(grades, { includeFailed: false, minPassingGpa: 2.0 });
    // Solo la nota de 95 (4.0) sobrevive el filtro >= 2.0
    expect(result).toBeCloseTo(4.0, 5);
  });

  test('devuelve null si el array está vacío o no es válido', () => {
    expect(gpaForStudent([])).toBeNull();
    expect(gpaForStudent(null)).toBeNull();
  });

  test('ignora registros de nota no numérica dentro de la lista', () => {
    const result = gpaForStudent([{ score: 90 }, { score: 'ausente' }, {}]);
    expect(result).toBeCloseTo(4.0, 5);
  });

  test('REGRESIÓN: una nota null (pendiente de calificar) se excluye, no cuenta como 0', () => {
    const result = gpaForStudent([{ score: 90 }, { score: null }]);
    expect(result).toBeCloseTo(4.0, 5); // si null contara como 0, sería (4.0+0)/2 = 2.0
  });
});

describe('honorsStatus', () => {
  test('with_honors cuando el GPA alcanza el umbral (3.5 por defecto)', () => {
    expect(honorsStatus(3.5)).toBe('with_honors');
    expect(honorsStatus(4.0)).toBe('with_honors');
  });

  test('near_honors en el rango [umbral-0.5, umbral)', () => {
    expect(honorsStatus(3.0)).toBe('near_honors');
    expect(honorsStatus(3.49)).toBe('near_honors');
  });

  test('standard por debajo del rango de near_honors', () => {
    expect(honorsStatus(2.9)).toBe('standard');
    expect(honorsStatus(0)).toBe('standard');
  });

  test('devuelve null para GPA no numérico', () => {
    expect(honorsStatus(null)).toBeNull();
    expect(honorsStatus(undefined)).toBeNull();
  });
});

describe('gradePointDescription', () => {
  test.each([
    [4.0, 'Excellent'],
    [3.7, 'Very Good'],
    [3.0, 'Good'],
    [2.0, 'Satisfactory'],
    [1.0, 'Needs Improvement'],
    [0.5, 'Unsatisfactory'],
  ])('gpa=%f -> %s', (gpa, expected) => {
    expect(gradePointDescription(gpa)).toBe(expected);
  });

  test('devuelve null para valores no numéricos', () => {
    expect(gradePointDescription(NaN)).toBeNull();
  });
});

describe('convertToGradePoints (alias usado por servicios)', () => {
  test('es equivalente a fromScore con la tabla vigente', () => {
    expect(convertToGradePoints(90)).toBe(fromScore(90));
    expect(convertToGradePoints(55)).toBe(fromScore(55));
  });
});

describe('convertToLetterGrade (usado en el flujo de aprobación de cambios de nota)', () => {
  test.each([
    [95, 'A'],
    [90, 'A'],
    [89, 'B'],
    [80, 'B'],
    [75, 'C'],
    [70, 'C'],
    [65, 'D'],
    [60, 'D'],
    [59, 'F'],
    [0, 'F'],
  ])('score=%d -> %s', (score, expected) => {
    expect(convertToLetterGrade(score)).toBe(expected);
  });

  test('devuelve null para valores no numéricos', () => {
    expect(convertToLetterGrade('pendiente')).toBeNull();
  });
});

describe('DEFAULT_GPA_TABLE', () => {
  test('está ordenada de forma coherente con la lógica de fromScore', () => {
    const thresholds = Object.keys(DEFAULT_GPA_TABLE).map(Number).sort((a, b) => a - b);
    const values = thresholds.map((t) => DEFAULT_GPA_TABLE[t]);
    // A mayor umbral, mayor (o igual) GPA -- si esto se rompe, fromScore
    // podría devolver un GPA menor para una nota más alta.
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    }
  });
});
