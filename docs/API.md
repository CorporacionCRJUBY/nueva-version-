# ACADEMIX 2.0 — API Reference

## Authentication & Headers
All requests to protected routes require a JWT Bearer token:
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Standard API Response Format
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

## Standard Error Format (Rule 113)
```json
{
  "success": false,
  "code": "GRADE_EDIT_WINDOW_EXPIRED",
  "message": "The 24-hour grade modification window has expired."
}
```

## Core Route Categories

### 1. Authentication (`/api/auth`)
- `POST /api/auth/login` — Authenticate user, returns JWT and user payload with roles/permissions.
- `GET /api/auth/me` — Returns current authenticated user profile.
- `POST /api/auth/refresh` — Refresh active token.
- `POST /api/auth/logout` — Invalidate session.

### 2. Students & Expediente (`/api/students`)
- `GET /api/students` — List students with filters (grade, branchId, status, search).
- `GET /api/students/:id` — Get student full profile.
- `POST /api/students` — Create new student (generates code `STU-YYYY-NNNNNN`).
- `PUT /api/students/:id` — Update student details.
- `DELETE /api/students/:id` — Soft-delete student record.
- `GET /api/guardians?studentId=:id` — Guardians linked to student.
- `GET /api/medical-records?studentId=:id` — Medical history of student.
- `GET /api/documents?studentId=:id` — Documents uploaded for student.

### 3. Attendance System (`/api/attendance`)
- `GET /api/attendance` — Query attendance logs.
- `GET /api/attendance/monthly/:assignmentId/:year/:month` — Full monthly matrix (1..31 days, weekdays, totals P/O/E/U, rate%).
- `GET /api/attendance/student/:studentId/:year/:month` — Individual student monthly report.
- `POST /api/attendance/daily` — Bulk upsert daily attendance records.
- `PUT /api/attendance/:id` — Teacher/Admin update attendance record.

### 4. Grades & Gradebook (`/api/grades`)
- `GET /api/grades` — List grades by student, assignment, or academic period.
- `POST /api/grades` — Record grade (initiates 24-hour edit window with `edit_deadline`).
- `PUT /api/grades/:id` — Edit grade within 24h window.
- `POST /api/grades/:id/request-change` — Teacher submits grade change request after lock.

### 5. Grade Change Requests (`/api/grade-change-requests`)
- `GET /api/grade-change-requests` — List pending requests (generates code `REQ-YYYY-NNNNNN`).
- `POST /api/grade-change-requests/:id/approve` — Admin approves: auto-updates grade record and inserts grade history.
- `POST /api/grade-change-requests/:id/reject` — Admin rejects request with review notes.

### 6. Reports & PDF Output (`/api/reports`, `/api/report-cards`, `/api/progress-reports`, `/api/transcripts`)
- `POST /api/progress-reports/generate` — Compiles and renders official Progress Report PDF.
- `POST /api/report-cards/generate` — Compiles and renders official Report Card (RP 26-27) PDF.
- `POST /api/transcripts/generate` — Compiles and renders Official High School Transcript PDF.
- `GET /api/reports/:id/preview` — Streams generated PDF.
- `GET /api/reports/:id/download` — Downloads official versioned document.
