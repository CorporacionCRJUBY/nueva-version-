# ACADEMIX 2.0 — Attendance Module Reference

## Core Rules & Statuses (Rule 20 & 22-26)
- **P (Present):** Student physically present in class.
- **O (Online):** Student attending via authorized virtual classroom.
- **E (Excused Absence):** Documented medical or administrative excused absence.
- **U (Unexcused Absence):** Absence without valid justification.

## Monthly Class Attendance Landscape Matrix
- **Header:** Teacher name, Course/Subject, Grade/Section, Room, Month, Year.
- **Days:** Computed dynamically according to calendar days in month (28, 29, 30, 31).
- **Weekdays:** Automatically mapped (M, Tu, W, Th, F, Sa, Su). Weekends shaded.
- **Exclusions:** Holidays and breaks configured in `school_calendar` are accounted for.
- **Per-Student Totals:**
  $$\text{Total Present} = P + O$$
  $$\text{Total Absent} = E + U$$
  $$\text{Attendance Rate (\%)} = \frac{P + O}{(P + O) + (E + U)} \times 100$$

## Editing & Teacher Permissions (Rule 3)
Teachers can update attendance records without 24-hour time restrictions as long as they own the academic assignment or have explicit attendance permissions. Every modification generates an `attendance_history` log.
