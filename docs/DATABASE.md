# ACADEMIX 2.0 — Database Schema Reference

## Architecture & Conventions
- **Engine:** MySQL 8.0 / MariaDB
- **Query Builder:** Knex.js with Connection Pooling
- **Soft Deletes:** `deleted_at` (TIMESTAMP NULL) and `deleted_by` (INT NULL)
- **Primary Keys:** AUTO_INCREMENT integer IDs
- **Sequential Codes:** Atomic sequential generation via `code_sequences` table
- **Active-row uniqueness:** Las tablas con borrado lógico usan una columna
  generada `active_guard TINYINT GENERATED ALWAYS AS (IF(deleted_at IS NULL, 1, NULL))`
  con índice UNIQUE compuesto, de modo que la unicidad aplica solo entre filas
  activas (MySQL/MariaDB no soporta índices parciales). Aplicado en
  `academic_history`, `medical_records`, `graduation_records` y `gransif_records`
  (migración 056).

## Core Entities & Tables (58 Migrations)

### 1. Security & Identity
- `users`: Core account table with password hashes (bcrypt) and branch association.
  Incluye endurecimiento de seguridad: `login_attempts`, `locked_until`
  (bloqueo temporal por intentos fallidos), `password_changed_at`, y columnas de
  2FA (`twofa_secret` / `twofa_pending_secret` cifrados en reposo con
  AES-256-GCM — formato `enc:v1:<iv>:<authTag>:<ciphertext>` —, `twofa_enabled`,
  `twofa_backup_codes`, `twofa_enabled_at`). Los secretos TOTP se cifran con la
  clave maestra `ENCRYPTION_KEY` (migraciones 049, 054, 055, 057).
- `roles`: Role definitions (`SUPER_ADMIN`, `ADMIN`, `TEACHER`).
- `permissions`: Granular action permissions (`module.action`).
- `role_permissions`: Many-to-many relationship between roles and permissions.
- `code_sequences`: Atomic counters for each prefix and year.
- `revoked_tokens`: Lista negra de JWT (`jti`) revocados antes de su expiración
  (logout, cambio de contraseña, revocación de sesiones). `token_type` admite
  `access`, `refresh` y `2fa_challenge` (migración 058): los challenges 2FA se
  canjean una sola vez insertando aquí su jti — el INSERT atómico con UNIQUE(jti)
  es la compuerta single-use (un duplicado falla con ER_DUP_ENTRY).

### 2. Academic Core
- `students`: Student profile with `middle_name`, `second_last_name`, `identification_number`, `photo_url`, `branch_id`, and `status`.
- `student_status_history`: Audit trail for status changes (`ACTIVE`, `GRADUATED`, `WITHDRAWN`, etc.).
- `teachers`: Teacher profiles with code `TEA-YYYY-NNNNNN`.
- `guardians`: Family & guardian profiles with code `GUA-YYYY-NNNNNN`.
- `student_guardians`: Many-to-many link with primary and authorized pickup flags.
- `subjects`: Academic subject catalogue with credit values and hours.
- `academic_years`: Annual cycles (e.g. 2026-2027).
- `academic_periods`: Quarters (Q1, Q2, Q3, Q4) with start/end dates.
- `academic_assignments`: Link between teacher, subject, grade, section, branch, and year.

### 3. Attendance & Grades
- `attendance_records`: Daily records with ENUM `('P', 'O', 'E', 'U')`.
- `attendance_history`: Audit log for attendance edits.
- `grade_records`: Grade entries with `edit_deadline` (24h) and composite unique key `(student_id, subject_id, assignment_id, academic_period_id)`.
- `grade_history`: Full versioning of every grade value alteration.
- `grade_change_requests`: Formal change requests (`REQ-YYYY-NNNNNN`) with approval flow.

### 4. Transcripts & Graduation
- `academic_history`: Permanent historical records across grades and years.
- `credits` & `credit_history`: Credit accumulation and tracking.
- `gpa_records` & `gpa_history`: Term and Cumulative GPA records.
- `previous_schools`: Transfer credits from external institutions.
- `transcripts` & `transcript_versions`: Official High School Transcripts (`TRN-YYYY-NNNNNN`).
- `graduation_records` & `gransif_records`: Final candidate validations.

### 5. System, Audit & Jobs
- `activity_logs`: Registro de actividad de la aplicación por usuario.
- `audit_logs`: Auditoría de acciones sensibles. `user_id` es NULLABLE:
  las acciones del sistema (jobs programados como archivo de reportes o
  cierre de períodos de notas) se registran sin usuario (migración 055).
- Retención: el job diario `auditRetentionJob` purga `activity_logs` y
  `audit_logs` más antiguos que `AUDIT_RETENTION_DAYS` (default 730 días)
  en lotes de 5000 filas.
