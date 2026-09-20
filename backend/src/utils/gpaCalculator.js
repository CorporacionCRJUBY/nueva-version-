'use strict';

/**
 * GPA calculation utilities for ACADEMIX.
 *
 * This module implements a configurable GPA engine so services can compute
 * weighted GPAs from grade records without depending on a specific model or
 * repository layer.
 */

const DEFAULT_MAX_GRADE = Number(process.env.GPA_MAX_GRADE) || 100;
const DEFAULT_MIN_GRADE = Number(process.env.GPA_MIN_GRADE) || 0;

const DEFAULT_SCALE = Number(process.env.GPA_SCALE) || 4.0;
const DEFAULT_HONORS_THRESHOLD = Number(process.env.GPA_HONORS_THRESHOLD) || 3.5;

const DEFAULT_GRADE_WEIGHT = Number(process.env.GPA_DEFAULT_WEIGHT) || 1;

const DEFAULT_GPA_TABLE = {
  90: 4.0,
  85: 3.7,
  80: 3.3,
  75: 3.0,
  70: 2.7,
  65: 2.3,
  60: 2.0,
  55: 1.7,
  50: 1.3,
  40: 1.0,
  0: 0.0,
};

function loadGpaTable() {
  try {
    const raw = process.env.GPA_TABLE_CONFIG;
    if (!raw) {
      return DEFAULT_GPA_TABLE;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_GPA_TABLE;
    }

    const table = {};
    Object.entries(parsed).forEach(([grade, gpa]) => {
      const g = Number(grade);
      const v = Number(gpa);
      if (!Number.isFinite(g) || !Number.isFinite(v)) {
        return;
      }
      table[g] = v;
    });

    if (Object.keys(table).length === 0) {
      return DEFAULT_GPA_TABLE;
    }

    return table;
  } catch (error) {
    return DEFAULT_GPA_TABLE;
  }
}

function fromScore(score, table = null) {
  // FIX (auditoria - null tratado como nota 0): `Number(null)` es `0`, que
  // es un umbral válido de la tabla, así que sin este chequeo explícito
  // fromScore(null) devolvía 0.0 en vez de `null` (nota ausente tratada
  // como reprobado con la peor nota posible). Mismo problema con `''`.
  if (score === null || score === undefined || score === '') {
    return null;
  }

  const t = table || loadGpaTable();
  const numericScore = Number(score);
  if (!Number.isFinite(numericScore)) {
    return null;
  }

  const sorted = Object.keys(t)
    .map((k) => Number(k))
    .sort((a, b) => b - a);

  let result = t[sorted[sorted.length - 1]];
  for (const threshold of sorted) {
    if (numericScore >= threshold) {
      result = t[threshold];
      break;
    }
  }

  if (result == null) {
    return null;
  }

  return result;
}

function weightedAverage(items) {
  if (!Array.isArray(items)) {
    return null;
  }

  let totalWeight = 0;
  let totalPoints = 0;

  items.forEach((item) => {
    if (!item || typeof item !== 'object') {
      return;
    }

    // Mismo chequeo que en fromScore: sin esto, un item con score null/''
    // se convertiría en Number(...) === 0 antes de llegar a fromScore, y
    // contaría como una nota real de 0 en el promedio ponderado.
    if (item.score === null || item.score === undefined || item.score === '') {
      return;
    }

    const score = Number(item.score);
    const weight = Number(item.weight ?? DEFAULT_GRADE_WEIGHT);

    if (!Number.isFinite(score) || !Number.isFinite(weight) || weight <= 0) {
      return;
    }

    const gpa = fromScore(score);
    if (gpa == null) {
      return;
    }

    totalWeight += weight;
    totalPoints += gpa * weight;
  });

  if (totalWeight <= 0) {
    return null;
  }

  return totalPoints / totalWeight;
}

function gpaForStudent(grades, options = {}) {
  if (!Array.isArray(grades)) {
    return null;
  }

  const includeFailed = options.includeFailed !== false;
  const minPassingGpa = Number(options.minPassingGpa) || 0;

  const filtered = grades
    .filter((g) => {
      if (!g || typeof g !== 'object') {
        return false;
      }

      // Ver nota en weightedAverage/fromScore: score null/'' no es 0.
      if (g.score === null || g.score === undefined || g.score === '') {
        return false;
      }

      const score = Number(g.score);
      if (!Number.isFinite(score)) {
        return false;
      }

      const gpa = fromScore(score);
      if (gpa == null) {
        return false;
      }

      if (!includeFailed && gpa < minPassingGpa) {
        return false;
      }

      return true;
    });

  return weightedAverage(filtered);
}

function honorsStatus(gpa) {
  const threshold = Number(process.env.GPA_HONORS_THRESHOLD) || DEFAULT_HONORS_THRESHOLD;
  if (!Number.isFinite(gpa)) {
    return null;
  }

  if (gpa >= threshold) {
    return 'with_honors';
  }

  if (gpa >= threshold - 0.5) {
    return 'near_honors';
  }

  return 'standard';
}

function gradePointDescription(gpa) {
  if (!Number.isFinite(gpa)) {
    return null;
  }

  if (gpa >= 4.0) {
    return 'Excellent';
  }
  if (gpa >= 3.5) {
    return 'Very Good';
  }
  if (gpa >= 3.0) {
    return 'Good';
  }
  if (gpa >= 2.0) {
    return 'Satisfactory';
  }
  if (gpa >= 1.0) {
    return 'Needs Improvement';
  }
  return 'Unsatisfactory';
}

/**
 * Convierte una nota numérica (0-100) a puntos de GPA (escala 0-4).
 * Es un alias amigable de fromScore() — acepta un `scale` opcional por
 * compatibilidad con las llamadas existentes, pero la tabla vigente es la
 * configurada vía GPA_TABLE_CONFIG / DEFAULT_GPA_TABLE.
 */
function convertToGradePoints(score, scale) {
  return fromScore(score);
}

/**
 * Convierte una nota numérica (0-100) a su letra (A/B/C/D/F).
 */
function convertToLetterGrade(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) {
    return null;
  }
  if (s >= 90) return 'A';
  if (s >= 80) return 'B';
  if (s >= 70) return 'C';
  if (s >= 60) return 'D';
  return 'F';
}

module.exports = {
  fromScore,
  weightedAverage,
  gpaForStudent,
  honorsStatus,
  gradePointDescription,
  convertToGradePoints,
  convertToLetterGrade,
  loadGpaTable,
  DEFAULT_GPA_TABLE,
  DEFAULT_SCALE,
  DEFAULT_MAX_GRADE,
  DEFAULT_MIN_GRADE,
  DEFAULT_HONORS_THRESHOLD,
};
