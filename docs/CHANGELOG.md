# ACADEMIX 2.0 — Changelog

## Version 2.0.0 (Master Release)
- **Database:** Added 48 Knex migrations and fixed composite unique key `(student_id, subject_id, assignment_id, academic_period_id)` in `grade_records`.
- **Attendance:** Updated ENUMs to official standards (`P`, `O`, `E`, `U`) and built the Monthly Class Attendance 1..31 days matrix.
- **Grades:** Enforced 24-hour edit window with automated locking and atomic approval of Grade Change Requests.
- **PDF Engine:** Integrated `pdfmake` to compile official `RP 26-27` Report Cards and High School Transcripts.
- **Frontend:** Built the 10-tab Student Record dossier, hierarchical navigation sidebar, and monthly attendance matrix.
- **Documentation:** Authored 12 comprehensive technical documentation guides.
