# ACADEMIX 2.0 — Grades & 24-Hour Rule Reference

## 24-Hour Grade Modification Rule (Rule 4 & 36)
1. **Creation:** When a grade is entered, the system assigns `created_at` and sets:
   $$\text{edit\_deadline} = \text{created\_at} + 24\text{ Hours}$$
2. **Within 24 Hours:** Teacher can freely edit grade values. Status remains `DRAFT` or `PUBLISHED`.
3. **Past 24 Hours:** System locks the grade (`status = 'LOCKED'`). Any PUT attempt throws:
   ```json
   { "success": false, "code": "GRADE_EDIT_WINDOW_EXPIRED", "message": "The 24-hour grade modification window has expired." }
   ```
4. **Grade Change Request Flow:**
   Teacher submits Request (`REQ-YYYY-NNNNNN`) $\rightarrow$ Administration Reviews $\rightarrow$ Approved:
   - System atomically updates `grade_records.grade_value`
   - System sets `status = 'UNLOCKED'`
   - System inserts previous and new values into `grade_history`
   - System records audit log before/after
