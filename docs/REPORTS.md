# ACADEMIX 2.0 — Reports & Versioning Reference

## Official Output Formats
1. **Progress Report (RP 26-27):** Q1-Q4 progress evaluation with integrated attendance days.
2. **Official Report Card (RP 26-27):** Comprehensive quarterly report card with dynamic subjects, final grades, attendance summary, teacher comments, and parent signature blocks.
3. **Official Transcript (26-27):** Multi-year transcript for college admission and Florida graduation.
4. **Monthly Class Attendance:** Landscape attendance register.

## Document Versioning (Rules 47, 60, 110, 111)
When generating documents with code `REP-YYYY-NNNNNN` or `TRN-YYYY-NNNNNN`:
- Never overwrite past official files.
- Each generation creates a record in `report_versions` or `transcript_versions` (`Version 1`, `Version 2`).
- Past versions remain archived and downloadable for historical audits.
