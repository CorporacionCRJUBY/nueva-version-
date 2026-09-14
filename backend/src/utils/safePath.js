'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const AppError = require('./AppError');

const AUTO_GENERATE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.pdf',
  '.docx',
  '.xlsx',
  '.zip',
]);

/**
 * Safe path helpers for user-supplied file paths and storage locations.
 *
 * These functions are intended to keep file operations inside an allowed
 * base directory and avoid path traversal injected via user input.
 */

const TRAVERSAL_SEQUENCES = [
  '..',
  '.',
];

/**
 * Normalize and validate a user-supplied path segment.
 *
 * Returns null if the input is unsafe.
 */
function sanitizeSegment(segment) {
  if (segment == null) {
    return null;
  }

  const str = String(segment).trim();
  if (str === '') {
    return null;
  }

  if (TRAVERSAL_SEQUENCES.includes(str)) {
    return null;
  }

  // Avoid components that look like traversal attempts.
  if (str.includes('..')) {
    return null;
  }

  // Avoid absolute paths.
  if (path.isAbsolute(str)) {
    return null;
  }

  // Avoid Windows-style absolute drives like C:...
  if (/^[A-Za-z]:[\\/]/.test(str)) {
    return null;
  }

  return str;
}

/**
 * Build a safe relative file path under a base directory.
 *
 * If `filename` is unsafe, this refuses to guess and returns null.
 */
function safeJoin(baseDir, filename, options = {}) {
  if (!baseDir || !filename) {
    return null;
  }

  const base = path.resolve(String(baseDir));
  const name = sanitizeSegment(filename);

  if (name === null && !options.allowAutogenerate) {
    return null;
  }

  const ext = path.extname(name || '');
  const fallbackName = options.fallbackName || 'unnamed';

  const finalName = name || fallbackName;

  // If no extension and allowed, generate one.
  let fileNameToUse = finalName;
  if (!ext && options.preferredExtension) {
    fileNameToUse = `${finalName}${options.preferredExtension}`;
  }

  const resolved = path.resolve(base, fileNameToUse);

  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    return null;
  }

  return resolved;
}

/**
 * Check whether a path is inside an allowed base directory.
 */
function isInside(baseDir, targetPath) {
  const base = path.resolve(String(baseDir));
  const target = path.resolve(String(targetPath));

  if (target === base) {
    return true;
  }

  return target.startsWith(base + path.sep);
}

/**
 * Ensure a directory exists.
 */
function ensureDirectory(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  } catch (error) {
    if (error && error.code === 'EEXIST') {
      return true;
    }
    throw error;
  }
}

/**
 * Create a safe, collision-resistant filename in a directory.
 */
function generateSafeFilename(directory, extension, prefix = 'file') {
  ensureDirectory(directory);

  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString('hex');
  const name = `${prefix}_${timestamp}_${random}`;

  return path.join(directory, name + extension);
}

/**
 * Resolve an upload directory based on environment configuration.
 */
function uploadBaseDir() {
  const configured = process.env.UPLOAD_DIR || process.env.FILE_STORAGE_DIR;
  if (configured) {
    return path.resolve(configured);
  }

  const fallback = path.resolve(process.cwd(), 'uploads');
  return fallback;
}

/**
 * Resuelve una ruta (posiblemente del cliente) dentro de un directorio
 * raíz permitido. Si la ruta escapa de la raíz (path traversal) lanza un
 * AppError 400 genérico — los servicios lo usan para rechazar file_path /
 * photo_url maliciosos sin revelar por qué.
 */
function resolveWithinRoot(baseDir, userPath) {
  if (userPath == null || userPath === '') {
    throw new AppError('Invalid file path', 400);
  }

  const base = path.resolve(String(baseDir));
  const resolved = path.resolve(base, String(userPath));

  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new AppError('Invalid file path', 400);
  }

  return resolved;
}

/**
 * Comprueba si una ruta ya resuelta está contenida dentro de un directorio
 * raíz permitido. A diferencia de `resolveWithinRoot`, NO lanza: devuelve
 * `true`/`false`.
 *
 * ¿Por qué existe? Un registro guardado en la base de datos puede apuntar a
 * un archivo que ya no está bajo la raíz de subidas actual — por ejemplo tras
 * mover el proyecto de carpeta, migrar de servidor o restaurar un respaldo.
 * En ese caso la política correcta es REGENERAR el documento, no devolver un
 * error al funcionario (ver el comentario en transcripts/reportCards/
 * progressReports `preview()`).
 */
function isPathWithinRoot(baseDir, resolvedPath) {
  if (resolvedPath == null || resolvedPath === '') return false;
  try {
    const base = path.resolve(String(baseDir));
    const resolved = path.resolve(String(resolvedPath));
    return resolved === base || resolved.startsWith(base + path.sep);
  } catch {
    return false;
  }
}

module.exports = {
  sanitizeSegment,
  safeJoin,
  isInside,
  ensureDirectory,
  generateSafeFilename,
  uploadBaseDir,
  resolveWithinRoot,
  isPathWithinRoot,
};
