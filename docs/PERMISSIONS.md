# ACADEMIX 2.0 — Role-Based Access Control & Permissions

## Roles
1. **SUPER_ADMIN:** Full control over users, roles, settings, branches, calendar, and global audit.
2. **ADMIN:** Administrative access to students, teachers, assignments, scholarships, and reports.
3. **TEACHER:** Access to assigned classes, attendance recording, gradebook, and grade change requests.

## Permission Matrix
- `students.view`, `students.create`, `students.edit`, `students.delete`
- `attendance.view`, `attendance.create`, `attendance.edit`
- `grades.view`, `grades.create`, `grades.edit`, `grades.request_change`
- `scholarships.view`, `scholarships.create`, `scholarships.edit`
- `reports.view`, `reports.generate`, `reports.print`
- `transcripts.view`, `transcripts.generate`, `transcripts.print`
- `audit.view`, `settings.manage`
