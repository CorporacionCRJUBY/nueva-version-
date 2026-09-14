// FILE: backend/src/validators/settings.validator.js
const { body } = require('express-validator');

// Bug fix: this used to validate a set of keys (`language`, `theme`,
// `school_email`, `academic_year_start/end`, `grading_scale`,
// `attendance_threshold`, `notification_enabled`, `email_notifications`)
// that don't exist anywhere in the seeded system_settings rows and that no
// business logic reads. Realigned to the actual keys from
// 13_system_settings.seed.js (Plan §81-95), the ones gpa.service.js and
// the rest of the app actually consume.
const settingsValidators = {
  update: [
    body().isObject().withMessage('Settings must be an object'),
    // School Information (§83)
    body('school_name').optional().isString().withMessage('School name must be a string'),
    body('school_address').optional().isString().withMessage('School address must be a string'),
    body('school_phone').optional().isString().withMessage('School phone must be a string'),
    body('school_motto').optional().isString().withMessage('School motto must be a string'),
    body('school_code').optional().isString().withMessage('School code must be a string'),
    // Academic Year / Language / Format (§81, Rule 1)
    body('default_academic_year').optional().isString().withMessage('Default academic year must be a string'),
    body('default_language').optional().isIn(['en', 'es']).withMessage('Default language must be en or es'),
    body('date_format').optional().isString().withMessage('Date format must be a string'),
    body('time_format').optional().isIn(['12h', '24h']).withMessage('Time format must be 12h or 24h'),
    body('time_zone').optional().isString().withMessage('Time zone must be a string'),
    // GPA Scale / Credit Rules (§55, §56, Rule 55)
    body('gpa_scale').optional().isFloat({ min: 0 }).withMessage('GPA scale must be a positive number'),
    body('min_gpa_to_graduate').optional().isFloat({ min: 0 }).withMessage('Minimum GPA to graduate must be a positive number'),
    body('required_credits_to_graduate').optional().isInt({ min: 0 }).withMessage('Required credits to graduate must be a positive integer'),
    // Attendance / Grade Settings (§26, §36)
    body('grade_edit_window_hours').optional().isInt({ min: 0 }).withMessage('Grade edit window must be a positive integer (hours)'),
    body('attendance_edit_requires_permission').optional().isBoolean().withMessage('Attendance edit requires permission must be a boolean'),
    // Report Settings (§69, §70)
    body('report_default_paper_size').optional().isString().withMessage('Report default paper size must be a string'),
    body('report_monthly_attendance_orientation').optional().isIn(['Portrait', 'Landscape']).withMessage('Report orientation must be Portrait or Landscape'),
    // File Settings (§95)
    body('max_upload_size_mb').optional().isInt({ min: 1 }).withMessage('Max upload size must be a positive integer (MB)'),
    body('allowed_document_extensions').optional().isString().withMessage('Allowed document extensions must be a comma-separated string'),
  ],
};

module.exports = settingsValidators;