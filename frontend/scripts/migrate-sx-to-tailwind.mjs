// FILE: frontend/scripts/migrate-sx-to-tailwind.mjs
/**
 * CODEMOD — Migración de la capa de estilos MUI a Tailwind CSS.
 *
 * Transformaciones por archivo (todas mecánicas y seguras):
 *
 *   1. `sx={EXPR}`  ->  `style={sx(EXPR)}`
 *      El helper `sx()` (src/ui/sx.js) traduce las declaraciones al vuelo,
 *      así que las expresiones dinámicas, arrays y callbacks siguen
 *      funcionando. No hay que evaluar nada en el codemod.
 *
 *   2. `import { A as B, C } from '@mui/icons-material'`  ->  lucide-react.
 *      El identificador LOCAL se conserva, de modo que el JSX que usa el
 *      icono no se toca.
 *
 *   3. Añade `import { sx } from '<ruta relativa>/ui/sx';` cuando hace falta.
 *
 * Uso:
 *   node scripts/migrate-sx-to-tailwind.mjs          # aplica
 *   node scripts/migrate-sx-to-tailwind.mjs --dry    # solo informa
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import MagicString from 'magic-string';

const traverse = _traverse.default ?? _traverse;

const SRC = path.resolve('src');
const dryRun = process.argv.includes('--dry');
const explicitTargets = process.argv.slice(2).filter((a) => !a.startsWith('--'));

// ---------------------------------------------------------------------------
// Iconos MUI -> Lucide (clave = identificador LOCAL en el código)
// ---------------------------------------------------------------------------
const ICON_MAP = {
  AddIcon: 'Plus',
  EditIcon: 'Pencil',
  DeleteIcon: 'Trash2',
  ViewIcon: 'Eye',
  SaveIcon: 'Save',
  CancelIcon: 'XCircle',
  BackIcon: 'ArrowLeft',
  RefreshIcon: 'RefreshCw',
  DownloadIcon: 'Download',
  UploadIcon: 'CloudUpload',
  SearchIcon: 'Search',
  FilterIcon: 'Filter',
  PrintIcon: 'Printer',
  PdfIcon: 'FileText',
  FileIcon: 'FileText',
  ReportIcon: 'FileText',
  ReportsIcon: 'FileText',
  RecordIcon: 'FileText',
  GenerateIcon: 'Play',
  ApproveIcon: 'CheckCircle2',
  RejectIcon: 'XCircle',
  ValidateIcon: 'CheckCircle2',
  CheckIcon: 'Check',
  CheckCircleIcon: 'CheckCircle2',
  ErrorIcon: 'AlertOctagon',
  CloseIcon: 'X',
  Lock: 'Lock',
  LockIcon: 'Lock',
  ShieldIcon: 'Shield',
  ShieldOutlined: 'Shield',
  SecurityIcon: 'Shield',
  AdminIcon: 'ShieldCheck',
  AuditIcon: 'Shield',
  PasswordIcon: 'KeyRound',
  Email: 'Mail',
  EmailIcon: 'Mail',
  PhoneIcon: 'Phone',
  PersonIcon: 'User',
  ProfileIcon: 'UserCircle',
  StudentsIcon: 'Users',
  UsersIcon: 'Users',
  GroupsRounded: 'Users',
  TeachersIcon: 'School',
  SchoolIcon: 'School',
  AcademicIcon: 'School',
  GuardiansIcon: 'Contact',
  SubjectsIcon: 'BookOpen',
  GradesIcon: 'GraduationCap',
  AcademicHistoryIcon: 'History',
  HistoryIcon: 'History',
  AttendanceIcon: 'CalendarCheck',
  CalendarIcon: 'CalendarDays',
  AssignmentIcon: 'ClipboardList',
  AssignmentsIcon: 'ClipboardList',
  GransifIcon: 'ClipboardCheck',
  GraduationIcon: 'Award',
  ScholarshipIcon: 'Star',
  ScholarshipsIcon: 'Star',
  CreditsIcon: 'Receipt',
  MedicalIcon: 'HeartPulse',
  PreviousSchoolIcon: 'Building',
  BranchesIcon: 'Building2',
  DocumentsIcon: 'FolderOpen',
  DocsIcon: 'FolderOpen',
  RequestsIcon: 'ListChecks',
  RolesIcon: 'Gavel',
  PermissionsIcon: 'Lock',
  StatusIcon: 'ArrowLeftRight',
  DashboardIcon: 'LayoutDashboard',
  HomeIcon: 'Home',
  InsightsRounded: 'TrendingUp',
  TrendingUpIcon: 'TrendingUp',
  TrendingDownIcon: 'TrendingDown',
  NotificationsIcon: 'Bell',
  SettingsIcon: 'Settings',
  LogoutIcon: 'LogOut',
  TranslateIcon: 'Languages',
  ServerIcon: 'Server',
  CpuIcon: 'Cpu',
  MemoryIcon: 'MemoryStick',
  DiskIcon: 'HardDrive',
  StorageIcon: 'HardDrive',
  UptimeIcon: 'Timer',
  MonitorIcon: 'Activity',
  LogsIcon: 'Terminal',
  RestartIcon: 'RotateCcw',
  ActivateIcon: 'Play',
  CloudIcon: 'CloudUpload',
  ContentCopyIcon: 'Copy',
  CalculateIcon: 'Calculator',
  MoreVertIcon: 'MoreVertical',
  MenuIcon: 'Menu',
  ChevronLeftIcon: 'ChevronLeft',
  ExpandLess: 'ChevronUp',
  ExpandMore: 'ChevronDown',
  PhotoCamera: 'Camera',
  PhotoCameraIcon: 'Camera',
  Visibility: 'Eye',
  VisibilityIcon: 'Eye',
  VisibilityOff: 'EyeOff',
  VisibilityOffIcon: 'EyeOff',
};

// ---------------------------------------------------------------------------
/** Añade el import del helper `sx` si el archivo no lo tiene. */
function ensureSxImport(ms, filePath, ast) {
  const already = ast.program.body.find(
    (n) => n.type === 'ImportDeclaration' && /ui\/sx$/.test(n.source.value)
  );
  if (already) return;

  const fromDir = path.dirname(filePath);
  let rel = path.relative(fromDir, path.join(SRC, 'ui', 'sx')).split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = `./${rel}`;

  const firstImport = ast.program.body.find((n) => n.type === 'ImportDeclaration');
  const line = `import { sx } from '${rel}';\n`;
  if (firstImport) ms.appendLeft(firstImport.start, line);
  else ms.prepend(line);
}

function processFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  if (!code.includes('@mui/') && !code.includes('sx=')) return null;

  let ast;
  try {
    ast = parse(code, { sourceType: 'module', plugins: ['jsx'], errorRecovery: true });
  } catch (err) {
    console.error(`  ! PARSE FAIL ${filePath}: ${err.message}`);
    return null;
  }

  const ms = new MagicString(code);
  const edits = [];
  let iconCount = 0;

  traverse(ast, {
    ImportDeclaration(p) {
      const src = p.node.source.value;
      if (src !== '@mui/icons-material' && !src.startsWith('@mui/icons-material/')) return;

      const lines = [
        ...new Set(
          p.node.specifiers
            .filter((s) => s.type === 'ImportSpecifier')
            .map((s) => {
              const orig = s.imported.name ?? s.imported.value;
              const local = s.local.name;
              const mapped = ICON_MAP[local] ?? ICON_MAP[orig] ?? 'Circle';
              return mapped === local ? mapped : `${mapped} as ${local}`;
            })
        ),
      ];
      iconCount += lines.length;
      edits.push({
        start: p.node.start,
        end: p.node.end,
        text: `import { ${lines.join(', ')} } from 'lucide-react';`,
      });
    },

    JSXAttribute(p) {
      if (p.node.name?.name !== 'sx') return;
      const value = p.node.value;
      if (!value || value.type !== 'JSXExpressionContainer') return;
      const expr = value.expression;
      const inner = code.slice(expr.start, expr.end);
      edits.push({ start: p.node.start, end: p.node.end, text: `style={sx(${inner})}` });
    },
  });

  if (edits.length === 0) return null;

  const sxCount = edits.filter((e) => e.text.startsWith('style={sx(')).length;
  edits.sort((a, b) => b.start - a.start);
  for (const e of edits) ms.overwrite(e.start, e.end, e.text);

  if (sxCount > 0) ensureSxImport(ms, filePath, ast);

  return { code: ms.toString(), sxCount, iconCount };
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (/\.jsx$/.test(entry.name)) out.push(p);
  }
  return out;
}

const files = explicitTargets.length ? explicitTargets : walk(SRC);
let changed = 0;
let totalSx = 0;
let totalIcons = 0;

for (const f of files) {
  const res = processFile(f);
  if (!res) continue;
  changed += 1;
  totalSx += res.sxCount;
  totalIcons += res.iconCount;
  if (!dryRun) fs.writeFileSync(f, res.code, 'utf8');
  console.log(`  ${path.relative(process.cwd(), f)}  sx=${res.sxCount} icons=${res.iconCount}`);
}

console.log(
  `\n${dryRun ? '[DRY RUN] ' : ''}${changed} archivos migrados · ${totalSx} props sx · ${totalIcons} iconos -> lucide-react`
);
