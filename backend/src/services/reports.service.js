// FILE: backend/src/services/reports.service.js
const AppError = require('../utils/AppError');
const repository = require('../repositories/reports.repository');

// NOTA DE SEGURIDAD: pdf_path/pdf_url apuntaban a rutas de servidor o a la
// antigua carpeta pública /uploads (ya eliminada). Nunca deben llegar al
// cliente crudos — solo se expone un flag has_pdf; el archivo real se sirve
// por GET /reports/:id/preview, autenticado y con permisos.
const sanitize = (record) => {
  if (!record) return record;
  const { pdf_path, pdf_url, ...safe } = record;
  return { ...safe, has_pdf: Boolean(pdf_path) };
};
const sanitizeList = (records) => records.map(sanitize);

const ReportsService = {
  async findAll(filters, user) {
    const { page = 1, pageSize = 20, search, category, status, studentId, academicPeriodId, dateFrom, dateTo } = filters;
    const queryFilters = { search, category, status, studentId, academicPeriodId, dateFrom, dateTo };
    const [data, total] = await Promise.all([
      repository.findAll({ ...queryFilters, page, pageSize }),
      repository.count(queryFilters),
    ]);
    return { data: sanitizeList(data), total, page: Number(page), pageSize: Number(pageSize) };
  },

  async findById(id, user) {
    const record = await repository.findById(id);
    if (!record) throw new AppError('Report not found', 404);
    return sanitize(record);
  },

  // Reports are generated from their respective modules (ProgressReports, ReportCards, etc.)
  // Preview reuses the raw record (with real category) to dispatch to the module
  // that actually owns the PDF generation/streaming logic.
  async preview(id, user) {
    const record = await repository.findById(id);
    if (!record) throw new AppError('Report not found', 404);

    if (record.category === 'report-cards') {
      return require('./reportCards.service').preview(id, user);
    }
    if (record.category === 'progress-reports') {
      return require('./progressReports.service').preview(id, user);
    }
    throw new AppError('This report type does not support preview', 400);
  },
};

module.exports = ReportsService;