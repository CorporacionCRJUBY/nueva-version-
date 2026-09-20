// FILE: backend/src/middleware/branchAccess.middleware.js
//
// NOTA (auditoria hallazgo #3): este middleware por sí solo NO era
// suficiente para aislar sedes, porque solo podía validar un branch_id si
// venía explícito en la petición (params/query/body), y la mayoría de las
// rutas reales no lo mandan (el :id de la URL es del recurso, no de la
// sede). La validación real y autoritativa ahora vive en la capa de
// servicio (ver backend/src/utils/branchScope.js), que carga el registro
// de la base y compara su branch_id contra req.user.branches sin confiar
// en lo que decida mandar el cliente. Este middleware se deja como chequeo
// temprano/defensa en profundidad para el caso en que sí venga un
// branch_id explícito, pero nunca es la única barrera.
/**
 * Middleware - restringe acceso a branches asignadas
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
const restrictBranch = (req, res, next) => {
  // SUPER_ADMIN bypassa completamente el control de branches
  if (req.user && req.user.roles && req.user.roles.includes('SUPER_ADMIN')) {
    return next();
  }

  // Verificar que el usuario tenga branches asignadas
  const userBranches = req.user?.branches || [];
  if (userBranches.length === 0) {
    return res.status(403).json({
      success: false,
      code: 'BRANCH_FORBIDDEN',
      message: 'User has no branches assigned'
    });
  }

  // Buscar branch_id en diferentes lugares
  let branchId = null;

  // 1. En params (ej. /:branchId/... o /branch/:branchId)
  if (req.params) {
    if (req.params.branchId) branchId = parseInt(req.params.branchId, 10);
    else if (req.params.branch_id) branchId = parseInt(req.params.branch_id, 10);
  }

  // 2. En query string
  if (!branchId && req.query) {
    if (req.query.branchId) branchId = parseInt(req.query.branchId, 10);
    else if (req.query.branch_id) branchId = parseInt(req.query.branch_id, 10);
  }

  // 3. En body
  if (!branchId && req.body) {
    if (req.body.branchId) branchId = parseInt(req.body.branchId, 10);
    else if (req.body.branch_id) branchId = parseInt(req.body.branch_id, 10);
  }

  // Si no hay branch_id en la petición, asumimos que la operación no está restringida
  // o que debe validarse en el servicio (ej. usando req.user.branch_id predeterminado)
  if (!branchId) {
    // Para operaciones que no especifican branch_id, permitimos acceso
    // pero el controlador debe usar el branch del usuario si es necesario
    return next();
  }

  // Verificar si el branchId está en las branches del usuario
  if (!userBranches.includes(branchId)) {
    return res.status(403).json({
      success: false,
      code: 'BRANCH_FORBIDDEN',
      message: `User does not have access to branch ${branchId}`
    });
  }

  next();
};

/**
 * Middleware para setear branch_id desde el usuario autenticado
 * Útil para endpoints POST/PUT que necesitan un branch_id por defecto
 * @param {string} fieldName - Nombre del campo en req.body donde inyectar
 * @returns {Function} Middleware de Express
 */
const injectUserBranch = (fieldName = 'branch_id') => {
  return (req, res, next) => {
    if (!req.user) return next();

    // SUPER_ADMIN puede no tener branch fijo
    if (req.user.roles && req.user.roles.includes('SUPER_ADMIN')) {
      return next();
    }

    // FIX (QA — 500 en lugar de 403 para roles sin privilegios):
    // `req.body` es `undefined` en peticiones GET/HEAD/DELETE sin cuerpo
    // (Express solo lo inicializa cuando hay body-parser activo y contenido).
    // Al desreferenciarlo, un TEACHER pidiendo GET /api/users o
    // GET /api/students provocaba "Cannot read properties of undefined
    // (reading 'branch_id')" -> 500. Ahora se normaliza el body y se omite la
    // inyección cuando no hay dónde escribir:
    if (!req.body || typeof req.body !== 'object') {
      return next();
    }

    // Si el usuario tiene una sola branch, inyectarla automáticamente
    const userBranches = req.user.branches || [];
    if (userBranches.length === 1 && !req.body[fieldName]) {
      req.body[fieldName] = userBranches[0];
    }

    next();
  };
};

module.exports = { restrictBranch, injectUserBranch };