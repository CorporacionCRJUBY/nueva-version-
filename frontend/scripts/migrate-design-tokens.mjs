#!/usr/bin/env node
// FILE: frontend/scripts/migrate-design-tokens.mjs
/**
 * CODEMOD — Migración de tokens de diseño a la paleta del panel de referencia.
 *
 * ¿Por qué existe?
 *   El rediseño cambia el lenguaje visual heredado (morado académico #7847e3
 *   sobre lavanda #faf9ff) por el de la referencia (violeta #7c3aed sobre
 *   lavanda #f5f3ff, borde #ddd6fe, tinta #1e1b4b, acento #a78bfa).
 *
 *   La mayoría del código NO tiene colores literales: usa clases semánticas de
 *   Tailwind (`bg-brand-600`, `text-ink-muted`), así que se reestiliza solo al
 *   cambiar `tailwind.config.js`. Pero hay unos pocos sitios donde el color
 *   quedó escrito a mano (gradientes de los gráficos SVG, valores por defecto
 *   de la API `sx`, tokens JS). Este script los migra con una tabla explícita,
 *   de forma auditable y reejecutable.
 *
 * Uso:
 *   node scripts/migrate-design-tokens.mjs --check   # informa, no escribe
 *   node scripts/migrate-design-tokens.mjs           # aplica los cambios
 *
 * Sustituye tanto hex (`#7847e3`) como sus formas rgba equivalentes.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', 'src')

/** Tabla de migración: hex heredado -> hex de la referencia. */
const HEX_MAP = {
  // Marca primaria (morado académico -> violeta de la referencia)
  '#7847e3': '#7c3aed',
  '#8f6bf2': '#8b5cf6',
  '#6532c4': '#6d28d9',
  '#53289f': '#5b21b6',
  '#3d1c76': '#4c1d95',
  '#2a1256': '#2e1065',
  // Acento lila
  '#ad93fb': '#a78bfa',
  '#cdbcff': '#c4b5fd',
  '#e3dbff': '#ddd6fe',
  '#f0ebff': '#ede9fe',
  '#f7f5ff': '#f5f3ff',
  '#ece3fb': '#ede9fe',
  // Superficie corporativa (sidebar / violeta profundo)
  '#241046': '#1e1b4b',
  '#1a0b33': '#191241',
  '#2f1657': '#2d1b69',
  // Lienzo y líneas
  '#faf9ff': '#f5f3ff',
  '#f4f1fd': '#f5f3ff',
  '#ebe4f7': '#ddd6fe',
  '#d8cdee': '#c4b5fd',
  // Tinta
  '#1e1233': '#1e1b4b',
  '#564a75': '#6b5b95',
  '#7d6f9c': '#7c6faa',
  '#9c8fbb': '#7c6faa',
  '#b9a9d9': '#a78bfa',
  // Semánticos (alineados con el set de la referencia)
  '#059669': '#047857',
  '#d97706': '#b45309',
  '#dc2626': '#b91c1c',
}

/** Los mismos cambios, en las formas rgba() usadas por sombras y degradados. */
const RGBA_MAP = {
  'rgba(120,71,227': 'rgba(124,58,237',
  'rgba(120, 71, 227': 'rgba(124, 58, 237',
  'rgba(30,18,51': 'rgba(30,27,75',
  'rgba(30, 18, 51': 'rgba(30, 27, 75',
  'rgba(173,147,251': 'rgba(167,139,250',
  'rgba(173, 147, 251': 'rgba(167, 139, 250',
  'rgba(101,50,196': 'rgba(109,40,217',
  'rgba(101, 50, 196': 'rgba(109, 40, 217',
  'rgba(36,16,70': 'rgba(30,27,75',
  'rgba(36, 16, 70': 'rgba(30, 27, 75',
}

const EXTS = new Set(['.js', '.jsx'])
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git'])

/** Recorre `src/` recolectando los archivos JS/JSX editables. */
function collect(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue
    const full = path.join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) collect(full, out)
    else if (EXTS.has(path.extname(entry))) out.push(full)
  }
  return out
}

/** Aplica todas las sustituciones (hex, en cualquier caja, y rgba). */
function transform(text) {
  let out = text
  const counts = {}

  for (const [from, to] of Object.entries(HEX_MAP)) {
    // Case-insensitive: el código mezcla #7847E3 y #7847e3.
    const re = new RegExp(from.replace('#', '#'), 'gi')
    const found = out.match(re)
    if (found) {
      counts[from] = (counts[from] ?? 0) + found.length
      out = out.replace(re, to)
    }
  }

  for (const [from, to] of Object.entries(RGBA_MAP)) {
    const found = out.split(from).length - 1
    if (found) {
      counts[from] = (counts[from] ?? 0) + found
      out = out.split(from).join(to)
    }
  }

  return { out, counts }
}

const checkOnly = process.argv.includes('--check')
const files = collect(ROOT)

let touched = 0
let totalReplacements = 0

console.log(`\nMigración de tokens de diseño — ${files.length} archivos en src/\n`)
console.log('Archivo'.padEnd(52), 'Sustituciones')

for (const file of files) {
  const original = readFileSync(file, 'utf8')
  const { out, counts } = transform(original)
  if (out === original) continue

  const n = Object.values(counts).reduce((a, b) => a + b, 0)
  const rel = path.relative(ROOT, file)
  const detail = Object.entries(counts)
    .map(([k, v]) => `${k}×${v}`)
    .join(' ')
  console.log(rel.padEnd(52), String(n).padStart(4), ' ', detail)

  if (!checkOnly) writeFileSync(file, out, 'utf8')
  touched += 1
  totalReplacements += n
}

console.log(
  `\n${checkOnly ? '[CHECK] Se modificarían' : 'Modificados'} ${touched} archivos, ${totalReplacements} sustituciones.`
)
if (checkOnly && touched > 0) console.log('Ejecuta sin --check para aplicarlo.\n')
if (touched === 0) console.log('Nada que migrar: no quedan colores de la paleta heredada.\n')
