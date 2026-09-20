import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Todas las claves t('modulo.clave') que usa el código deben existir en ES y
// EN. Sin esto, la UI muestra la clave cruda (p. ej. "teachers.firstName").
function collectKeys(dir) {
  const keys = new Set();
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(path.join(d, entry.name));
      else if (/\.(jsx|js)$/.test(entry.name)) {
        const content = fs.readFileSync(path.join(d, entry.name), 'utf8');
        // \b evita falsos positivos como loadDict('es') o canEdit('x')
        const re = /\bt\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
        let m;
        while ((m = re.exec(content)) !== null) keys.add(m[1]);
      }
    }
  };
  walk(dir);
  return keys;
}

function loadDict(lang) {
  const dict = {};
  const dir = path.join(process.cwd(), 'src/i18n', lang);
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith('.json')) {
      Object.assign(dict, JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')));
    }
  }
  return dict;
}

// Claves que el regex captura pero no son traducciones reales.
const JUNK = new Set(['.', '-', 'T', 'a', 'en-US', 'modulo.clave', 'studentId', 'academic-periods']);

describe('i18n', () => {
  const keys = collectKeys(path.join(process.cwd(), 'src'));
  const dictEs = loadDict('es');
  const dictEn = loadDict('en');

  it('el código usa claves de traducción', () => {
    const real = [...keys].filter((k) => !JUNK.has(k));
    expect(real.length).toBeGreaterThan(100);
  });

  for (const lang of ['es', 'en']) {
    it(`todas las claves t() existen en ${lang}`, () => {
      const dict = lang === 'es' ? dictEs : dictEn;
      const missing = [];
      for (const key of keys) {
        if (JUNK.has(key)) continue;
        const [mod, ...rest] = key.split('.');
        const value = rest.reduce((o, s) => (o && typeof o === 'object' ? o[s] : undefined), dict[mod]);
        if (value === undefined) missing.push(key);
      }
      expect(missing).toEqual([]);
    });
  }

  it('los archivos de traducción son JSON válidos y tienen el módulo de nivel superior', () => {
    for (const lang of ['es', 'en']) {
      const dict = lang === 'es' ? dictEs : dictEn;
      for (const [mod, body] of Object.entries(dict)) {
        expect(typeof body, `${lang}: ${mod}`).toBe('object');
      }
    }
  });
});