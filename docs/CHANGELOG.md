# ACADEMIX 2.0 — Changelog

## Sin publicar

- **Asignaciones — autoasignación de materia por el docente (2026-09-16):**
  antes solo un ADMIN podía crear una `academic_assignments` (docente +
  materia + grupo + horario elegidos a mano). Ahora el docente entra a
  "Mis Grupos" (`/assignments/my-groups`), busca su grado+sección (la misma
  agrupación que ya existe en `students`) y se autoasigna la materia y el
  horario que va a dar; puede editar el horario o quitarse la materia
  después si algo quedó mal. El backend fuerza `teacher_id` al propio
  usuario cuando quien crea es un TEACHER (ignora cualquier `teacher_id` del
  body), bloquea que dos docentes queden asignados a la misma materia en el
  mismo grupo, y restringe editar/borrar/consultar a las asignaciones
  propias. Nuevo endpoint `GET /api/assignments/groups`.
  `backend/src/services/assignments.service.js`,
  `backend/src/controllers/assignments.controller.js`,
  `backend/src/routes/assignments.routes.js`,
  `backend/src/validators/assignments.validator.js`,
  `backend/src/models/students.model.js`,
  `database/seeds/02_roles_permissions.seed.js`,
  `frontend/src/features/assignments/pages/MyGroupsPage.jsx`.

## Version 2.0.0 (Master Release)
- **Database:** Added 48 Knex migrations and fixed composite unique key `(student_id, subject_id, assignment_id, academic_period_id)` in `grade_records`.
- **Attendance:** Updated ENUMs to official standards (`P`, `O`, `E`, `U`) and built the Monthly Class Attendance 1..31 days matrix.
- **Grades:** Enforced 24-hour edit window with automated locking and atomic approval of Grade Change Requests.
- **PDF Engine:** Integrated `pdfmake` to compile official `RP 26-27` Report Cards and High School Transcripts.
- **Frontend:** Built the 10-tab Student Record dossier, hierarchical navigation sidebar, and monthly attendance matrix.
- **Documentation:** Authored 12 comprehensive technical documentation guides.
