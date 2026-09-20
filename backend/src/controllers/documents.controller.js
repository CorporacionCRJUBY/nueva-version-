// FILE: backend/src/controllers/documents.controller.js
const documentsService = require('../services/documents.service');

const findAll = async (req, res, next) => {
  try {
    const { page, pageSize, search, studentId, documentType, status } = req.query;
    const result = await documentsService.findAll(
      { page, pageSize, search, studentId, documentType, status },
      req.user
    );
    res.json({ success: true, data: result.data, total: result.total, page: result.page, pageSize: result.pageSize });
  } catch (error) {
    next(error);
  }
};

const findById = async (req, res, next) => {
  try {
    const data = await documentsService.findById(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const data = await documentsService.create(req.body, req.user, req);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const data = await documentsService.update(req.params.id, req.body, req.user, req);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await documentsService.softDelete(req.params.id, req.user, req);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
};

const upload = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        code: 'NO_FILE',
        message: 'No file uploaded'
      });
    }
    const data = await documentsService.upload(req.file, req.body, req.user, req);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};


// FIX (previsualización de documentos): un nombre con caracteres fuera de
// Latin-1 (—, “ ”, emojis) hace que Node lance ERR_INVALID_CHAR al escribir la
// cabecera y la respuesta termina en 500 — el visor quedaba en blanco; y los
// acentos/ñ se enviaban como bytes Latin-1 que el navegador mostraba
// corruptos. Se emite una versión ASCII segura + filename* (RFC 5987) con el
// nombre real codificado.
const contentDisposition = (type, filename) => {
  const name = String(filename || 'document').replace(/[\r\n]/g, ' ');
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(name).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
};

// Si el registro no tiene un MIME fiable, se deduce de la extensión.
const EXT_MIME = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};
const effectiveMime = (mimeType, filename) => {
  const mime = String(mimeType || '').toLowerCase();
  if (mime === 'image/jpg') return 'image/jpeg';
  if (mime && mime !== 'application/octet-stream') return mimeType;
  const dot = String(filename || '').lastIndexOf('.');
  const ext = dot >= 0 ? String(filename).slice(dot).toLowerCase() : '';
  return EXT_MIME[ext] || mimeType || 'application/octet-stream';
};

const download = async (req, res, next) => {
  try {
    const { stream, filename, mimeType } = await documentsService.download(req.params.id, req.user);
    res.setHeader('Content-Type', effectiveMime(mimeType, filename));
    res.setHeader('Content-Disposition', contentDisposition('attachment', filename));
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// FIX (2026-09-17, previsualización de documentos): mismo archivo que
// download, pero con "inline" en vez de "attachment" — así el navegador
// intenta mostrarlo (PDF/imagen) en vez de forzar el diálogo de guardar. El
// frontend lo consume con responseType 'blob' y lo pinta en un <img>/<iframe>
// dentro de un diálogo, no navegando directo a esta URL.
const preview = async (req, res, next) => {
  try {
    const { stream, filename, mimeType } = await documentsService.preview(req.params.id, req.user);
    res.setHeader('Content-Type', effectiveMime(mimeType, filename));
    res.setHeader('Content-Disposition', contentDisposition('inline', filename));
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  contentDisposition,
  effectiveMime,
  findAll,
  findById,
  create,
  update,
  softDelete,
  upload,
  download,
  preview,
};