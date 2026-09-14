import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!e.name.startsWith('.')) walk(p); }
    else if (/\.(jsx|js)$/.test(e.name)) files.push(p);
  }
})(ROOT);

const PATTERNS = [
  /^\s*(Back|Refresh|Save|Cancel|Edit|Delete|Export|Import|Print|Upload|Download|Loading|Submit|Create|Update|Validate|Approve|Reject|Preview|Close|Confirm|Generate|Reprint|Activate|Deactivate|Lock|Unlock|Recalculate|Next|Previous)\s*$/,
  /^\s*(Save Changes|Add New|No Data|Not Found|Go Back|Forgot Password|Remember Me|Sign In|Log Out|Logout|Login|Register|Welcome Back|Monthly Class Attendance|Edit Profile|Change Password|Current Password|New Password|Confirm Password|Access Denied|Page Not Found|Save and Continue)\s*$/,
];

let count = 0;
const results = [];
for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('{') || trimmed.startsWith('}') || trimmed.startsWith('import') || trimmed.startsWith('const') || trimmed.startsWith('let') || trimmed.startsWith('return') || trimmed.startsWith('export') || trimmed.startsWith('</')) return;
    for (const re of PATTERNS) {
      if (re.test(trimmed)) {
        results.push(`${path.relative('.', file).replace(/\\/g, '/')}:${idx + 1}: ${line.trim()}`);
        count += 1;
        break;
      }
    }
  });
}

console.log(`${count} hardcoded strings:`);
for (const r of results.slice(0, 60)) console.log('  ' + r);