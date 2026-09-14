// FILE: backend/src/services/documents.service.js
const AppError = require('../utils/AppError');
const repository = require('../repositories/documents.repository');
const studentsRepository = require('../repositories/students.repository');
const { generateCode } = require('../utils/codeGenerator');
const auditService = require('./audit.service');
const fs = require('fs');
const path = require('path');
const { pick } = require('../utils/pick');
// FIX (auditoria hallazgo C1 - aislamiento por sede)
const { scopeFiltersToUserBranches, assertBranchAccess } = require('../utils/branchScope');
// SEGURIDAD (auditoria 2026-08-31, críticos C1-C3): contención de rutas
const { resolveWithinRoot } = require('../utils/safePath');

// FIX (auditoria hallazgo #5 - mass assignment): whitelist explícita de
// columnas reales de la tabla que el cliente puede escribir. Cualquier
// otro campo del body se ignora en vez de llegar crudo al INSERT/UPDATE.
// SEGURIDAD (auditoria 2026-08-31, crítico C1): file_path, file_name,
// file_size y mime_type NO son escribibles por el cliente — download()
// abre file_path con createReadStream y aceptarlos permitía leer cualquier
// archivo del servidor (p. ej. backend/.env → robo de JWT_SECRET). Solo
// create() (validando contención en uploads/) y upload() pueden fijarlos.
const ALLOWED_FIELDS = ['student_id', 'document_type', 'title', 'status', 'upload_date'];

const uploadsRoot = path.resolve(__dirname, '../../uploads');

const MIME_BY_EXT = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv',
};
const mimeFromPath = (filePath) => MIME_BY_EXT[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

// NOTA DE SEGURIDAD: file_path es una ruta absoluta del servidor de archivos —
// nunca debe llegar al cliente (fuga de infraestructura interna). El archivo real
// solo se sirve a través de DocumentsService.download(), que lee el registro
// crudo directamente del repositorio, no de estos métodos ya saneados.
const sanitize = (record) => {
  if (!record) return record;
  const { file_path, ...safe } = record;
  return safe;
};
const sanitizeList = (records) => records.map(sanitize);

// FIX (aislamiento por sede, M3): si el documento referencia un estudiante,
// ese estudiante debe pertenecer a las sedes del usuario. student_id puede
// ser opcional (documentos institucionales), por eso solo se valida si viene.
async function assertStudentInScope(studentId, user) {
  if (!studentId) return;
  const student = await studentsRepository.findById(studentId);
  assertBranchAccess(student, user, 'Student not found');
}

const DocumentsService = {
  async findAll(filters, user) {
    const { page = 1, pageSize = 20, search, studentId, documentType, status } = filters;
    // FIX (C1): solo documentos de estudiantes de las sedes del usuario.
    const queryFilters = scopeFiltersToUserBranches({ search, studentId, documentType, status }, user);
    const [data, total] = await Promise.all([
      repository.findAll({ ...queryFilters, page, pageSize }),
      repository.count(queryFilters),
    ]);
    return { data: sanitizeList(data), total, page: Number(page), pageSize: Number(pageSize) };
  },

  async findById(id, user) {
    const record = await repository.findById(id);
    assertBranchAccess(record, user, 'Document not found');
    return sanitize(record);
  },

  async create(payload, user, req) {
    const code = await generateCode('DOC');
    // FIX (aislamiento por sede, M3): valida la sede del estudiante referenciado.
    await assertStudentInScope(payload.student_id, user);
    // SEGURIDAD (crítico C1): el endpoint "registrar documento existente"
    // acepta file_path, pero solo si apunta a un archivo real DENTRO de
    // uploads/. Cualquier ruta fuera (p. ej. backend/.env, /etc/passwd)
    // se rechaza con 400 genérico.
    const containedPath = resolveWithinRoot(uploadsRoot, payload.file_path);
    if (!fs.existsSync(containedPath)) {
      throw new AppError('File does not exist in the uploads directory', 400);
    }
    const stat = fs.statSync(containedPath);
    const data = {
      ...pick(payload, ALLOWED_FIELDS),
      file_path: containedPath,
      file_name: path.basename(containedPath),
      file_size: stat.size,
      mime_type: mimeFromPath(containedPath),
      code,
      status: payload.status || 'ACTIVE',
      created_by: user.id,
      updated_by: user.id
    };
    const [id] = await repository.create(data);
    const record = await repository.findById(id);
    
    // FIX (segunda pasada, BAJO #14): el payload de auditoría también se
    // sanea — audit_logs es legible por quien tenga audit.view y file_path
    // es una ruta absoluta del servidor que no debe quedar ahí.
    await auditService.log({
      user,
      action: 'CREATE',
      module: 'documents',
      recordCode: code,
      after: sanitize(record),
      req
    });
    
    return sanitize(record);
  },

  async upload(file, payload, user, req) {
    // FIX (aislamiento por sede, M3): valida la sede del estudiante referenciado.
    await assertStudentInScope(payload.student_id, user);
    const code = await generateCode('DOC');
    const data = {
      ...pick(payload, ALLOWED_FIELDS),
      code,
      file_path: file.path,
      file_name: file.filename,
      file_size: file.size,
      mime_type: file.mimetype,
      upload_date: new Date(),
      status: 'ACTIVE',
      created_by: user.id,
      updated_by: user.id
    };
    const [id] = await repository.create(data);
    const record = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'UPLOAD',
      module: 'documents',
      recordCode: code,
      after: sanitize(record),
      req
    });
    
    return sanitize(record);
  },

  async download(id, user) {
    const record = await repository.findById(id);
    // FIX (C1): sin esto, cualquier usuario con permiso de descarga podía
    // descargar el archivo de un estudiante de otra sede solo adivinando/
    // enumerando el id.
    assertBranchAccess(record, user, 'Document not found');
    
    // SEGURIDAD (crítico C1): aunque la fila venga de antes del fix, el
    // stream solo se abre si la ruta está contenida en uploads/.
    const filePath = resolveWithinRoot(uploadsRoot, record.file_path);
    if (!fs.existsSync(filePath)) throw new AppError('File not found on server', 404);
    
    const stream = fs.createReadStream(filePath);
    return {
      stream,
      filename: record.file_name || 'document',
      mimeType: record.mime_type || 'application/octet-stream'
    };
  },

  async update(id, payload, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Document not found');
    // FIX (aislamiento por sede, M3): si se reasigna a otro estudiante, ese
    // estudiante también debe estar en las sedes del usuario.
    if (payload.student_id && Number(payload.student_id) !== Number(existing.student_id)) {
      await assertStudentInScope(payload.student_id, user);
    }
    
    const before = sanitize(existing);
    await repository.update(id, { ...pick(payload, ALLOWED_FIELDS), updated_by: user.id });
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'documents',
      recordCode: existing.code,
      before,
      after: sanitize(after),
      req
    });
    
    return sanitize(after);
  },

  async softDelete(id, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Document not found');
    
    await repository.softDelete(id, user.id);
    
    await auditService.log({
      user,
      action: 'DELETE',
      module: 'documents',
      recordCode: existing.code,
      before: sanitize(existing),
      req
    });
    
    return true;
  }
};

module.exports = DocumentsService;