'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');
const fileSignature = require('../utils/fileSignature');

const UPLOAD_BASE = env.UPLOAD_DIR || env.FILE_STORAGE_DIR || path.resolve(process.cwd(), 'uploads');
const MAX_FILE_SIZE = Number(env.UPLOAD_MAX_SIZE_BYTES) || Number(env.MAX_FILE_SIZE_BYTES) || 10 * 1024 * 1024;
const MAX_FILE_SIZE_MB = Math.floor(MAX_FILE_SIZE / (1024 * 1024));

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-ole-storage',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.docx',
  '.xlsx',
  '.zip',
]);

function memoryStorage() {
  return multer.memoryStorage();
}

function diskStorage(fieldName) {
  return multer.diskStorage({
    destination: (_req, file, cb) => {
      const folder = path.join(UPLOAD_BASE, fieldName || 'generic');
      fs.mkdirSync(folder, { recursive: true });
      cb(null, folder);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || '') || '.bin';
      const safeExt = ALLOWED_EXTENSIONS.has(ext.toLowerCase()) ? ext : '.bin';
      const name = `${Date.now()}_${Math.random().toString(36).slice(2)}.${safeExt.replace('.', '')}`;
      cb(null, name);
    },
  });
}

function fileFilter(req, file, cb) {
  const mimetype = (file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();

  const allowed = ALLOWED_MIME_TYPES.has(mimetype) || ALLOWED_EXTENSIONS.has(ext);

  if (!allowed) {
    return cb(
      null,
      false,
      new Error(`File type not allowed. Received: ${mimetype || 'unknown'}${ext ? ` (${ext})` : ''}`)
    );
  }

  cb(null, true);
}

function createUploadMiddleware(options = {}) {
  const storage = options.disk ? diskStorage(options.fieldName) : memoryStorage();

  const upload = multer({
    storage,
    fileFilter,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: options.maxFiles || 1,
      // El form multipart trae el archivo + metadatos (student_id,
      // document_type, title, ...); con límite 1 cualquier upload con
      // campos adicionales reventaba con LIMIT_FIELD_COUNT.
      fields: options.maxFields || 20,
    },
  });

  if (options.single) {
    return upload.single(options.single);
  }

  if (options.array) {
    return upload.array(options.array, options.arrayMax || 10);
  }

  if (options.fields) {
    return upload.fields(options.fields);
  }

  return upload.any();
}

function validateFileSignature(req, res, next) {
  const files = req.files;
  if (!files || !Array.isArray(files)) {
    return next();
  }

  const fileList = Array.isArray(files) ? files : Object.values(files).flat();
  let failed = false;

  fileList.forEach((file) => {
    if (!file || (!file.buffer && !file.path)) {
      return;
    }

    // Los archivos en memoria (memoryStorage) traen buffer; los guardados
    // en disco traen path — la firma se lee del origen que corresponda.
    const signature = file.buffer
      ? fileSignature.readBufferSignature(file.buffer)
      : fileSignature.readBufferSignature(fs.readFileSync(file.path));

    if (!signature) {
      failed = true;
      file.validationError = new Error('Unable to read file signature');
      return;
    }

    const detectedMime = fileSignature.detectMime(signature);

    if (!detectedMime) {
      failed = true;
      file.validationError = new Error('File signature does not match any allowed type');
      return;
    }

    if (!ALLOWED_MIME_TYPES.has(detectedMime)) {
      failed = true;
      file.validationError = new Error(`File signature indicates disallowed type: ${detectedMime}`);
      return;
    }
  });

  if (failed) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'One or more uploaded files have an invalid or disallowed format',
        status: 400,
      },
    });
  }

  next();
}

// Los helpers de uso común guardan en DISCO (los servicios consumen
// file.path / file.filename / file.destination — p. ej. documents.service
// y students.service). memoryStorage queda disponible para quien necesite
// el buffer en memoria explícitamente.
function single(fieldName) {
  return createUploadMiddleware({ single: fieldName, disk: true, fieldName });
}

function array(fieldName, maxFiles) {
  return createUploadMiddleware({ array: fieldName, arrayMax: maxFiles, disk: true, fieldName });
}

function fields(fieldDefinitions) {
  return createUploadMiddleware({ fields: fieldDefinitions, disk: true });
}

module.exports = {
  createUploadMiddleware,
  single,
  array,
  fields,
  validateFileSignature,
  UPLOAD_BASE,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  memoryStorage,
  diskStorage,
  fileFilter,
};
