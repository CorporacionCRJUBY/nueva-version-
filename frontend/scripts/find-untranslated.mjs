import fs from 'node:fs';
import path from 'node:path';

const esDir = path.resolve('src/i18n/es');
const enDir = path.resolve('src/i18n/en');

const ENGLISH_WORDS = [
  'Dashboard', 'Students', 'Teachers', 'Attendance', 'Grades', 'Scholarships',
  'Reports', 'Graduation', 'Branches', 'Calendar', 'Guardians', 'Documents',
  'Medical', 'Records', 'History', 'Previous', 'Schools', 'Profile', 'Settings',
  'Users', 'Roles', 'Permissions', 'Activity', 'Audit', 'Subjects', 'Assignments',
  'Periods', 'Years', 'Credits', 'GPA', 'Status', 'Name', 'Email', 'Phone',
  'Address', 'Code', 'Date', 'Actions', 'Edit', 'Delete', 'View', 'New', 'Add',
  'Create', 'Save', 'Cancel', 'Search', 'Filter', 'Export', 'Import', 'Total',
  'Page', 'Rows', 'Active', 'Inactive', 'Pending', 'Approved', 'Rejected',
  'Enabled', 'Disabled', 'Title', 'Description', 'Type', 'Category', 'Value',
  'Grade', 'Report', 'Card', 'Transcript', 'Progress', 'Student', 'Teacher',
  'Parent', 'Guardian', 'Enrollment', 'Academic', 'Year', 'Term', 'Semester',
  'Average', 'Cumulative', 'Calculated', 'Points', 'Fee', 'Payment', 'Invoice',
  'Receipt', 'Amount', 'Balance', 'Due', 'Discount', 'Application', 'Request',
  'Change', 'Locked', 'Unlocked', 'Closed', 'Open', 'Valid', 'Invalid',
  'Required', 'Optional', 'Confirm', 'Reset', 'Back', 'Next', 'Previous',
  'First', 'Last', 'All', 'None', 'Custom', 'Default', 'Advanced', 'Basic',
  'General', 'Personal', 'Contact', 'Emergency', 'Information', 'Details',
  'Summary', 'List', 'Form', 'Record', 'Account', 'Password', 'Username',
  'Role', 'Module', 'Menu', 'Notification', 'Message', 'Error', 'Warning',
  'Success', 'Loading', 'Saving', 'Welcome', 'Home', 'Logout', 'Login',
  'Language', 'System', 'Month', 'Week', 'Day', 'Today', 'Tomorrow',
  'Yesterday', 'Morning', 'Afternoon', 'Evening', 'Completed', 'In Progress',
  'Draft', 'Archived', 'Published', 'Unpublished', 'Print', 'Download',
  'Upload', 'Preview', 'Refresh', 'More', 'Less', 'Show', 'Hide', 'Enable',
  'Disable', 'Apply', 'Clear', 'Reject', 'Approve', 'Close', 'Lock',
  'Unlock', 'Recalculate', 'Generate', 'Validate', 'Reprint', 'Yes', 'No',
  'Version', 'Other', 'Unknown', 'None', 'Weight', 'Total', 'Issued', 'Due',
  'Subject', 'Section', 'Level', 'Room', 'Building', 'Schedule', 'Time',
  'Hour', 'Minutes', 'Director', 'Coordinator', 'Advisor', 'Assistant',
  'Faculty', 'Staff', 'Office', 'Department', 'Division', 'Session',
  'Quarter', 'Trimester', 'Honors', 'Magna', 'Cum Laude', 'Dean', 'List',
  'Certificate', 'Diploma', 'Credential', 'Letter', 'Remark', 'Comment',
  'Note', 'Observation', 'Reason', 'Cause', 'Effect', 'Result', 'Outcome',
  'Goal', 'Objective', 'Target', 'Plan', 'Strategy', 'Method', 'Process',
  'Procedure', 'Policy', 'Rule', 'Regulation', 'Standard', 'Requirement',
  'Prerequisite', 'Corequisite', 'Curriculum', 'Syllabus', 'Lesson', 'Unit',
  'Topic', 'Material', 'Resource', 'Tool', 'Equipment', 'Facility', 'Venue',
  'Location', 'Place', 'Area', 'Zone', 'Region', 'State', 'City', 'Country',
  'Nationality', 'Citizenship', 'Birth', 'Birthdate', 'Age', 'Gender', 'Sex',
  'Marital', 'Status', 'Religion', 'Language', 'National', 'ID', 'Number',
  'Identifier', 'Reference', 'Source', 'Destination', 'Origin', 'End',
  'Start', 'Begin', 'Finish', 'Stop', 'Continue', 'Pause', 'Resume', 'Retry',
  'Cancel', 'Save', 'Delete', 'Insert', 'Update', 'Remove', 'Add', 'Duplicate',
  'Copy', 'Paste', 'Cut', 'Undo', 'Redo', 'Zoom', 'Pan', 'Scroll', 'Navigate',
  'Breadcrumb', 'Toolbar', 'Sidebar', 'Header', 'Footer', 'Content', 'Body',
];

const get = (o, p) => p.split('.').reduce((a, k) => (a && a[k] !== undefined ? a[k] : undefined), o);

const esFiles = fs.readdirSync(esDir).filter((f) => f.endsWith('.json'));
const flags = [];
for (const file of esFiles) {
  const es = JSON.parse(fs.readFileSync(path.join(esDir, file), 'utf8'));
  const en = JSON.parse(fs.readFileSync(path.join(enDir, file), 'utf8'));
  const walk = (obj, prefix) => {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      const p = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'object' && v) { walk(v, p); continue; }
      if (typeof v !== 'string') continue;
      const ev = get(en, p);
      if (ev !== v) continue; // different from EN → already translated
      const hasSpanishChars = /[áéíóúüñÁÉÍÓÚÜÑ¿¡]/.test(v);
      const hasLower = /[a-z]/.test(v);
      if (!hasLower) continue; // e.g. "3", "A", "PDF"
      const hit = ENGLISH_WORDS.find((w) => new RegExp(`\\b${w}\\b`, 'i').test(v));
      if (hit && !hasSpanishChars) {
        flags.push({ file, key: p, value: v, word: hit });
      }
    }
  };
  walk(es, '');
}

flags.sort((a, b) => a.file.localeCompare(b.file) || a.key.localeCompare(b.key));
console.log(`${flags.length} suspicious values:`);
for (const f of flags) console.log(`${f.file} :: ${f.key} = ${JSON.stringify(f.value)}  (word: ${f.word})`);