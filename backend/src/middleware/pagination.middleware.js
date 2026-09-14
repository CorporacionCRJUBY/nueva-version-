/**
 * Stub pagination middleware for ACADEMIX backend.
 *
 * The route index expects ../middleware/pagination.middleware to export
 * a clampPagination function. If true pagination clamping is needed, extend
 * this module to inspect/resist query params (e.g. page/per_page) and attach
 * normalized pagination metadata to req.locals.
 *
 * For now this is a no-op so the app starts.
 */
function clampPagination(req, res, next) {
  return next();
}

module.exports = { clampPagination };
