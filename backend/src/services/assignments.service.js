// FILE: backend/src/services/assignments.service.js
const repository = require('../repositories/assignments.repository');
const teachersRepository = require('../repositories/teachers.repository');
const studentsRepository = require('../repositories/students.repository');
const subjectsRepository = require('../repositories/subjects.repository');
const AppError = require('../utils/AppError');
const { generateCode } = require('../utils/codeGenerator');
const auditService = require('./audit.service');
const { pick } = require('../utils/pick');
// FIX (auditoria hallazgo C1 - aislamiento por sede)
const { scopeFiltersToUserBranches, assertBranchAccess } = require('../utils/branchScope');

// FIX (auditoria hallazgo #5 - mass assignment): whitelist explícita de
// columnas reales de la tabla que el cliente puede escribir. Cualquier
// otro campo del body se ignora en vez de llegar crudo al INSERT/UPDATE.
const ALLOWED_FIELDS = ['teacher_id', 'subject_id', 'grade', 'section', 'branch_id', 'academic_year_id', 'schedule', 'status'];

// FIX (2026-09-16, autoasignación de materias): antes SOLO un ADMIN podía
// crear una `academic_assignments` (docente + materia + grupo elegidos a
// mano por administración, sin que el propio docente supiera qué le tocaba
// dar ni en qué horario). Ahora el docente entra, busca su grupo (grado +
// sección, tal como ya existen en `students`) y se autoasigna la materia y
// el horario. Estas dos funciones son el corazón de ese cambio de modelo:
// resuelven "¿quién es, como docente, el usuario que llamó al endpoint?" y
// "¿le pertenece esta asignación?", igual que ya se hacía en
// attendance.service.js para editar asistencia.
function isTeacherRole(user) {
  const roles = user?.roles || [];
  return roles.includes('TEACHER') && !roles.includes('ADMIN') && !roles.includes('SUPER_ADMIN');
}

async function resolveOwnTeacherId(user) {
  if (!user) return null;
  const teacher = await teachersRepository.findByUser(user.id);
  return teacher ? teacher.id : null;
}

function assertOwnsAssignment(record, ownTeacherId, message) {
  if (!record || record.teacher_id !== ownTeacherId) {
    throw new AppError(message, 403, { code: 'ASSIGNMENT_NOT_OWNER' });
  }
}

const AssignmentsService = {
  async findAll(filters, user) {
    const { page = 1, pageSize = 20, search, teacherId, subjectId, grade, section, branchId, academicYearId, status } = filters;
    // FIX (C1): un usuario no-SUPER_ADMIN solo puede ver asignaciones de sus propias sedes.
    const queryFilters = scopeFiltersToUserBranches(
      { search, teacherId, subjectId, grade, section, branchId, academicYearId, status },
      user
    );
    const [data, total] = await Promise.all([
      repository.findAll({ ...queryFilters, page, pageSize }),
      repository.count(queryFilters),
    ]);
    return { data, total, page: Number(page), pageSize: Number(pageSize) };
  },

  async findById(id, user) {
    const record = await repository.findById(id);
    assertBranchAccess(record, user, 'Assignment not found');
    return record;
  },

  async findByTeacher(teacherId, filters, user) {
    const { academicYearId } = filters;
    // FIX (2026-09-16): un TEACHER solo puede consultar SU PROPIO listado de
    // asignaciones ("Mis materias"). Antes cualquier docente autenticado
    // podía pasar el teacherId de otro colega en la URL y ver su horario
    // completo, porque este método nunca comparaba contra el usuario.
    if (isTeacherRole(user)) {
      const ownTeacherId = await resolveOwnTeacherId(user);
      if (ownTeacherId == null || Number(teacherId) !== ownTeacherId) {
        throw new AppError('You can only view your own assignments', 403);
      }
    }
    return repository.findByTeacher(teacherId, academicYearId);
  },

  async findBySection(sectionId, filters, user) {
    const { academicYearId } = filters;
    return repository.findBySection(sectionId, academicYearId);
  },

  // FIX (2026-09-16): la "planilla" de grupos que el docente recorre para
  // autoasignarse una materia. Un grupo no es más que grade+section+sede+año
  // tal como ya existen en `students` — no hace falta una tabla nueva. Por
  // cada grupo se listan las materias de esa sede/grado (tabla `subjects`,
  // que ya trae su propio `grade`) marcando cuál ya tiene docente y cuál no.
  async findGroups(filters, user) {
    const scopedFilters = scopeFiltersToUserBranches(
      { branchId: filters.branchId, academicYearId: filters.academicYearId },
      user
    );
    const groups = await studentsRepository.groupsSummary(scopedFilters);
    if (groups.length === 0) return [];

    const branchIds = [...new Set(groups.map((g) => g.branch_id))];
    const subjects = await subjectsRepository.findAll({
      branchIds,
      status: 'ACTIVE',
      page: 1,
      pageSize: 1000,
    });

    const assignmentFilters = scopeFiltersToUserBranches({ status: 'ACTIVE' }, user);
    const assignments = await repository.findAll({ ...assignmentFilters, page: 1, pageSize: 1000 });

    const ownTeacherId = isTeacherRole(user) ? await resolveOwnTeacherId(user) : null;

    return groups.map((g) => {
      const subjectsForGroup = subjects.filter(
        (s) => s.branch_id === g.branch_id && (!s.grade || s.grade === g.grade)
      );
      return {
        grade: g.grade,
        section: g.section,
        branch_id: g.branch_id,
        academic_year_id: g.academic_year_id,
        student_count: Number(g.student_count),
        subjects: subjectsForGroup.map((s) => {
          const assignment = assignments.find(
            (a) =>
              a.subject_id === s.id &&
              a.grade === g.grade &&
              a.section === g.section &&
              a.branch_id === g.branch_id &&
              a.academic_year_id === g.academic_year_id
          );
          return {
            subject_id: s.id,
            subject_name: s.name,
            hours_per_week: s.hours_per_week,
            assignment: assignment
              ? {
                  id: assignment.id,
                  teacher_id: assignment.teacher_id,
                  teacher_name: assignment.teacher_name,
                  schedule: assignment.schedule,
                  is_mine: ownTeacherId != null && assignment.teacher_id === ownTeacherId,
                }
              : null,
          };
        }),
      };
    });
  },

  async create(payload, user, req) {
    const data = { ...pick(payload, ALLOWED_FIELDS) };

    // FIX (2026-09-16): si quien crea es un docente (no ADMIN/SUPER_ADMIN),
    // la asignación es una AUTOASIGNACIÓN — se ignora cualquier teacher_id
    // que venga en el body (el docente no puede asignarle una materia a
    // otro colega) y se usa el registro de `teachers` ligado a su propio
    // usuario. Si su cuenta no tiene un `teachers.user_id` asociado, no hay
    // a quién asignarle la clase.
    if (isTeacherRole(user)) {
      const ownTeacherId = await resolveOwnTeacherId(user);
      if (ownTeacherId == null) {
        throw new AppError('Your account is not linked to a teacher record', 403);
      }
      data.teacher_id = ownTeacherId;

      // Evita que el mismo docente se autoasigne dos veces la misma
      // materia en el mismo grupo (duplicado por doble clic, por ejemplo).
      const own = await repository.findByTeacher(ownTeacherId, data.academic_year_id);
      const duplicate = own.find(
        (a) =>
          a.subject_id === data.subject_id &&
          a.grade === data.grade &&
          a.section === data.section &&
          a.branch_id === data.branch_id &&
          a.status !== 'INACTIVE'
      );
      if (duplicate) {
        throw new AppError('You already teach this subject in this group', 409, { code: 'ASSIGNMENT_DUPLICATE' });
      }
    } else if (data.teacher_id == null) {
      // ADMIN/SUPER_ADMIN capturando a mano SÍ debe indicar el docente —
      // solo el flujo de autoasignación del propio docente puede omitirlo.
      throw new AppError('Teacher ID is required', 400, { field: 'teacher_id' });
    }

    // Evita que dos docentes distintos queden asignados a la misma materia,
    // en el mismo grupo, el mismo año — sin importar quién crea el registro
    // (docente autoasignándose o ADMIN capturando a mano). Si ya existe una
    // asignación activa de OTRO docente para esa combinación, se avisa con
    // un 409 en vez de dejar dos profesores dando la misma clase al grupo.
    const existingForGroup = await repository.findAll({
      subjectId: data.subject_id,
      grade: data.grade,
      section: data.section,
      branchId: data.branch_id,
      academicYearId: data.academic_year_id,
      status: 'ACTIVE',
      page: 1,
      pageSize: 5,
    });
    const takenByAnother = existingForGroup.find((a) => a.teacher_id !== data.teacher_id);
    if (takenByAnother) {
      throw new AppError(
        `${takenByAnother.teacher_name || 'Another teacher'} already teaches this subject in this group`,
        409,
        { code: 'ASSIGNMENT_ALREADY_TAKEN' }
      );
    }

    const code = await generateCode('ASN');
    const finalData = {
      ...data,
      code,
      status: data.status || 'ACTIVE',
      created_by: user.id,
      updated_by: user.id
    };
    const [id] = await repository.create(finalData);
    const record = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'CREATE',
      module: 'assignments',
      recordCode: code,
      after: record,
      req
    });
    
    return record;
  },

  async update(id, payload, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Assignment not found');

    // FIX (2026-09-16): un docente solo puede editar (por ejemplo, corregir
    // el horario) sus PROPIAS asignaciones, nunca las de otro colega. ADMIN
    // y SUPER_ADMIN mantienen control total, tal como ya revisan/corrigen
    // cualquier otro registro del sistema.
    const payloadFields = pick(payload, ALLOWED_FIELDS);
    if (isTeacherRole(user)) {
      const ownTeacherId = await resolveOwnTeacherId(user);
      assertOwnsAssignment(existing, ownTeacherId, 'You do not have permission to modify this assignment');
      // Un docente no puede reasignarse la clase a sí mismo con otro id,
      // ni "regalarle" su asignación a otro docente cambiando teacher_id.
      delete payloadFields.teacher_id;
    }

    const before = { ...existing };
    await repository.update(id, { ...payloadFields, updated_by: user.id });
    const after = await repository.findById(id);
    
    await auditService.log({
      user,
      action: 'UPDATE',
      module: 'assignments',
      recordCode: existing.code,
      before,
      after,
      req
    });
    
    return after;
  },

  async softDelete(id, user, req) {
    const existing = await repository.findById(id);
    assertBranchAccess(existing, user, 'Assignment not found');

    // FIX (2026-09-16): igual que en update(), un docente solo puede borrar
    // (quitarse) una asignación que es suya — por ejemplo si se autoasignó
    // la materia equivocada por error.
    if (isTeacherRole(user)) {
      const ownTeacherId = await resolveOwnTeacherId(user);
      assertOwnsAssignment(existing, ownTeacherId, 'You do not have permission to delete this assignment');
    }

    await repository.softDelete(id, user.id);
    
    await auditService.log({
      user,
      action: 'DELETE',
      module: 'assignments',
      recordCode: existing.code,
      before: existing,
      req
    });
    
    return true;
  }
};

module.exports = AssignmentsService;
