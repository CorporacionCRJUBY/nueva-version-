// FILE: backend/src/models/guardians.model.js
const db = require('../config/database');
const { escapeLike } = require('../utils/escapeLike');

// Bug fix: the real schema (011_create_guardians.js / schema.sql) does NOT
// have student_id or full_name columns on `guardians` — a guardian is
// linked to a student through the `student_guardians` junction table
// (012_create_student_guardians.js), and the person's name is split into
// first_name/last_name like everywhere else in this system. The previous
// version of this model queried `guardians.student_id`, a column that does
// not exist, so findByStudent() (used by the Student full record page)
// threw a SQL error on every call.
const TABLE = 'guardians';
const LINK_TABLE = 'student_guardians';
const FIELDS = [
  'id', 'code', 'first_name', 'last_name', 'relationship', 'identification',
  'phone', 'secondary_phone', 'email', 'address', 'is_emergency_contact',
  'is_primary', 'authorized_pickup', 'status', 'notes',
  'created_at', 'updated_at', 'deleted_at', 'deleted_by', 'created_by', 'updated_by'
];

// Shared by findAll() and count() so the row query and the count query for
// pagination never drift out of sync with each other.
function applyGuardianFilters(query, { search, relationship }) {
  if (search) {
    query.where((builder) => {
      builder
        .where('guardians.code', 'like', `%${escapeLike(search)}%`)
        .orWhere('guardians.first_name', 'like', `%${escapeLike(search)}%`)
        .orWhere('guardians.last_name', 'like', `%${escapeLike(search)}%`);
    });
  }
  if (relationship) query.where('guardians.relationship', relationship);
  return query;
}

const Guardians = {
  TABLE,
  FIELDS,

  findAll(filters = {}) {
    const { search, studentId, relationship, branchIds, page, pageSize } = filters;
    let query = db(TABLE)
      .whereNull('guardians.deleted_at')
      .leftJoin(LINK_TABLE, 'student_guardians.guardian_id', 'guardians.id')
      .leftJoin('students', 'students.id', 'student_guardians.student_id')
      .groupBy('guardians.id')
      .select(
        'guardians.*',
        db.raw('MIN(student_guardians.student_id) as student_id'),
        db.raw("MIN(CONCAT(students.first_name, ' ', students.last_name)) as student_name")
      );

    if (studentId) query = query.where('student_guardians.student_id', studentId);
    // FIX (auditoria hallazgo C1): un tutor solo debe listarse si al menos
    // uno de sus estudiantes vinculados pertenece a una sede del usuario.
    if (branchIds) query.whereIn('students.branch_id', branchIds);
    applyGuardianFilters(query, { search, relationship });

    if (page && pageSize) {
      const offset = (page - 1) * pageSize;
      query = query.limit(pageSize).offset(offset);
    }

    return query.orderBy('guardians.is_primary', 'desc').orderBy('guardians.first_name', 'asc');
  },

  async count(filters = {}) {
    const { search, studentId, relationship, branchIds } = filters;
    let query = db(TABLE).whereNull('guardians.deleted_at');
    if (studentId) {
      query = query
        .innerJoin(LINK_TABLE, 'student_guardians.guardian_id', 'guardians.id')
        .where('student_guardians.student_id', studentId);
    }
    if (branchIds) {
      query = query
        .innerJoin(LINK_TABLE, 'student_guardians.guardian_id', 'guardians.id')
        .innerJoin('students', 'students.id', 'student_guardians.student_id')
        .whereIn('students.branch_id', branchIds);
    }
    applyGuardianFilters(query, { search, relationship });
    const [{ total }] = await query.countDistinct({ total: 'guardians.id' });
    return Number(total);
  },

  findById(id) {
    return db(TABLE).where({ id, deleted_at: null }).first();
  },

  // Same as findById but also resolves the linked student_id from the
  // junction table, so the edit form can pre-fill which student this
  // guardian belongs to.
  async findByIdWithStudent(id) {
    const guardian = await Guardians.findById(id);
    if (!guardian) return null;
    const link = await db(LINK_TABLE).where({ guardian_id: id }).first();
    return { ...guardian, student_id: link ? link.student_id : null };
  },

  // FIX (auditoria hallazgo C1): variante para autorización por sede. Un
  // guardián puede en teoría estar vinculado a varios estudiantes; se
  // expone branch_id de CUALQUIERA de sus estudiantes vinculados (uso
  // actual del sistema es 1 tutor -> 1 estudiante). assertBranchAccess()
  // solo necesita saber si el usuario tiene acceso a ESA sede.
  async findByIdWithBranch(id) {
    const guardian = await Guardians.findById(id);
    if (!guardian) return null;
    const link = await db(LINK_TABLE)
      .leftJoin('students', 'students.id', 'student_guardians.student_id')
      .where('student_guardians.guardian_id', id)
      .select('students.branch_id')
      .first();
    return { ...guardian, branch_id: link ? link.branch_id : null };
  },

  findByStudent(studentId) {
    return db(TABLE)
      .whereNull('guardians.deleted_at')
      .innerJoin(LINK_TABLE, 'student_guardians.guardian_id', 'guardians.id')
      .where('student_guardians.student_id', studentId)
      .select('guardians.*', 'student_guardians.student_id as student_id')
      .orderBy('guardians.is_primary', 'desc');
  },

  async create(data) {
    const { student_id, ...guardianData } = data;
    const [id] = await db(TABLE).insert(guardianData);
    if (student_id) {
      await db(LINK_TABLE).insert({
        student_id,
        guardian_id: id,
        is_primary: guardianData.is_primary || false,
        is_emergency_contact: guardianData.is_emergency_contact || false,
      });
    }
    return [id];
  },

  async update(id, data) {
    const { student_id, ...guardianData } = data;
    const result = await db(TABLE).where({ id }).update({ ...guardianData, updated_at: db.fn.now() });
    if (student_id) {
      const existingLink = await db(LINK_TABLE).where({ guardian_id: id }).first();
      if (existingLink) {
        await db(LINK_TABLE).where({ id: existingLink.id }).update({
          student_id,
          is_primary: guardianData.is_primary ?? existingLink.is_primary,
          is_emergency_contact: guardianData.is_emergency_contact ?? existingLink.is_emergency_contact,
          updated_at: db.fn.now(),
        });
      } else {
        await db(LINK_TABLE).insert({
          student_id,
          guardian_id: id,
          is_primary: guardianData.is_primary || false,
          is_emergency_contact: guardianData.is_emergency_contact || false,
        });
      }
    }
    return result;
  },

  softDelete(id, userId) {
    return db(TABLE).where({ id }).update({
      deleted_at: db.fn.now(),
      deleted_by: userId
    });
  },

  // Removes this student's link to their guardians. The guardian records
  // themselves are left intact since (per the real schema) a guardian can
  // in principle be linked to more than one student.
  deleteByStudent(studentId) {
    return db(LINK_TABLE).where({ student_id: studentId }).del();
  }
};

module.exports = Guardians;
