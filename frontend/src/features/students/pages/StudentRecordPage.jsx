// FILE: frontend/src/features/students/pages/StudentRecordPage.jsx
//
// EXPEDIENTE DEL ESTUDIANTE — rediseño 2026-09-19
//
// Por qué se reescribió: la revisión del expediente en vivo mostró que, aunque
// las diez pestañas existían, la vista general no se leía como un expediente
// escolar real. Faltaba lo que un centro educativo espera encontrar de un
// vistazo (ficha con foto, edad, contacto de emergencia, alertas médicas),
// el GPA vacío se pintaba como un «— / 4.00» que parecía un dato roto y no un
// estado, y los «N/A» repetidos daban sensación de plantilla.
//
// Se conserva ÍNTEGRAMENTE la funcionalidad previa:
//   · las 10 pestañas y sus claves i18n, en el mismo orden;
//   · las acciones Editar / Cambiar estado / Imprimir / Volver;
//   · el diálogo de cambio de estado (studentsApi.updateStatus);
//   · el visor de documentos con descargar (documentsApi.download),
//     editar y eliminar (documentsApi.delete) y sus permisos
//     canEdit('documents') / canDelete('documents');
//   · la foto autenticada vía useAuthImage('/students/:id/photo');
//   · el modo impresión (`print-record` / `no-print`).
// No se añadió ni se cambió ninguna llamada a la API.
import { sx } from '../../../ui/sx';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  IconButton,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  ArrowLeft as BackIcon,
  Pencil as EditIcon,
  User as PersonIcon,
  School as AcademicIcon,
  CalendarCheck as AttendanceIcon,
  GraduationCap as GradesIcon,
  History as HistoryIcon,
  Contact as GuardiansIcon,
  FolderOpen as DocsIcon,
  HeartPulse as MedicalIcon,
  Star as ScholarshipIcon,
  Printer as PrintIcon,
  ArrowLeftRight as StatusIcon,
  Building as PreviousSchoolIcon,
  Eye as PreviewIcon,
  Download as DownloadIcon,
  Trash2 as DeleteIcon,
  Mail as MailIcon,
  Phone as PhoneIcon,
  MapPin as AddressIcon,
  Cake as BirthdayIcon,
  Cake as AgeIcon,
  ShieldAlert as AlertIcon,
  IdCard as IdIcon,
  UserCheck as EmergencyIcon,
  Percent as RateIcon,
  Award as GpaIcon,
  Layers as CreditsIcon,
  TriangleAlert as WarningIcon,
} from 'lucide-react';
import studentsApi from '../api';
import documentsApi from '../../documents/api';
import DocumentPreviewDialog from '../../documents/components/DocumentPreviewDialog';
import useAuthImage from '../../../hooks/useAuthImage';
import useConfirm from '../../../hooks/useConfirm';
import { usePermissions } from '../../../hooks/usePermissions';
import { formatDate } from '../../../utils/formatters';

const STATUS_COLOR = {
  ACTIVE: 'success',
  INACTIVE: 'default',
  GRADUATED: 'primary',
  WITHDRAWN: 'warning',
  TRANSFERRED: 'warning',
  SUSPENDED: 'error',
};

const ATTENDANCE_CHIP = {
  P: { label: 'Present (P)', bg: 'rgba(4,120,87,0.12)', color: '#047857' },
  O: { label: 'Online (O)', bg: 'rgba(124,58,237,0.12)', color: '#6d28d9' },
  E: { label: 'Excused (E)', bg: 'rgba(180,83,9,0.12)', color: '#b45309' },
  U: { label: 'Unexcused (U)', bg: 'rgba(185,28,28,0.12)', color: '#b91c1c' },
};

/* --------------------------------------------------------------------------- */
/* Primitivas de presentación del expediente                                    */
/* --------------------------------------------------------------------------- */

/** Ficha «etiqueta + valor» de las tarjetas de datos. */
const InfoRow = ({ icon: Icon, label, value, mono = false, emphasis = false }) => (
  <Box style={sx({ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 1 })}>
    {Icon && (
      <Box style={sx({ mt: 0.25, color: '#7c3aed', display: 'flex' })}>
        <Icon size={15} />
      </Box>
    )}
    <Box style={sx({ minWidth: 0, flex: 1 })}>
      <Typography
        variant="caption"
        style={sx({ display: 'block', color: '#7c6faa', lineHeight: 1.3, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.68rem', fontWeight: 600 })}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        style={sx({
          fontWeight: emphasis ? 700 : 500,
          color: value ? '#1e1b4b' : '#a99bd0',
          fontStyle: value ? 'normal' : 'italic',
          fontFamily: mono ? '"JetBrains Mono", monospace' : undefined,
          wordBreak: 'break-word',
        })}
      >
        {value || '—'}
      </Typography>
    </Box>
  </Box>
);

/** Panel con cabecera del expediente (título, icono y acción opcional). */
const RecordCard = ({ title, icon: Icon, action, children, sx: extra }) => (
  <Card style={sx([{ height: '100%', border: '1px solid #ddd6fe', boxShadow: '0 1px 2px rgba(30,27,75,0.05)' }, extra])}>
    <CardContent style={sx({ p: 2.5 })}>
      <Box style={sx({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 })}>
        <Box style={sx({ display: 'flex', alignItems: 'center', gap: 1 })}>
          {Icon && (
            <Box
              style={sx({
                display: 'grid',
                placeItems: 'center',
                width: 30,
                height: 30,
                borderRadius: '8px',
                background: '#f5f3ff',
                color: '#7c3aed',
                border: '1px solid #ddd6fe',
                flexShrink: 0,
              })}
            >
              <Icon size={15} />
            </Box>
          )}
          <Typography variant="subtitle1" style={sx({ color: '#1e1b4b', fontWeight: 700, fontSize: '0.95rem' })}>
            {title}
          </Typography>
        </Box>
        {action}
      </Box>
      <Divider style={sx({ mb: 1.5, borderColor: '#ede9fe' })} />
      {children}
    </CardContent>
  </Card>
);

/** Estado vacío con icono, explícito y con la misma altura que una tabla. */
const EmptyBlock = ({ icon: Icon, title, description }) => (
  <Box
    style={sx({
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      gap: 0.5,
      py: 5,
      px: 2,
    })}
  >
    {Icon && (
      <Box style={sx({ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: '10px', background: '#f5f3ff', color: '#a78bfa', border: '1px solid #ede9fe', mb: 0.5 })}>
        <Icon size={20} />
      </Box>
    )}
    <Typography variant="body2" style={sx({ fontWeight: 600, color: '#4c1d95' })}>
      {title}
    </Typography>
    {description && (
      <Typography variant="caption" style={sx({ color: '#7c6faa', maxWidth: 420, lineHeight: 1.5 })}>
        {description}
      </Typography>
    )}
  </Box>
);

/** Cabecera de tabla uniforme para todo el expediente. */
const HeadCell = ({ children, align = 'left', width }) => (
  <TableCell
    style={sx({
      fontWeight: 700,
      fontSize: '0.68rem',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: '#7c6faa',
      textAlign: align,
      width,
      whiteSpace: 'nowrap',
    })}
  >
    {children}
  </TableCell>
);

/** Anillo de progreso SVG (sin dependencias nuevas). */
const ProgressRing = ({ value, size = 62, stroke = 6, color = '#7c3aed' }) => {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Box style={sx({ position: 'relative', width: size, height: size, flexShrink: 0 })}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ede9fe" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
        />
      </svg>
      <Box style={sx({ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' })}>
        <Typography style={sx({ fontWeight: 800, fontSize: '0.85rem', color: '#1e1b4b' })}>{Math.round(pct)}%</Typography>
      </Box>
    </Box>
  );
};

/** Indicador de resumen bajo la cabecera. */
const SummaryTile = ({ icon: Icon, label, value, hint, tone = 'brand', progress }) => {
  const TONES = {
    brand: { bg: '#f5f3ff', fg: '#6d28d9', border: '#ddd6fe' },
    green: { bg: 'rgba(4,120,87,0.10)', fg: '#047857', border: 'rgba(4,120,87,0.20)' },
    amber: { bg: 'rgba(180,83,9,0.10)', fg: '#b45309', border: 'rgba(180,83,9,0.20)' },
    red: { bg: 'rgba(185,28,28,0.10)', fg: '#b91c1c', border: 'rgba(185,28,28,0.20)' },
    slate: { bg: '#f8fafc', fg: '#475569', border: '#e2e8f0' },
  };
  const tono = TONES[tone] || TONES.brand;
  return (
    <Card
      variant="outlined"
      style={sx({ height: '100%', border: `1px solid ${tono.border}`, background: '#fff' })}
      data-testid="record-summary-tile"
    >
      <CardContent style={sx({ p: 2, '&:last-child': { pb: 2 } })}>
        <Box style={sx({ display: 'flex', alignItems: 'center', gap: 1.5 })}>
          <Box style={sx({ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: '9px', background: tono.bg, color: tono.fg, flexShrink: 0 })}>
            <Icon size={17} />
          </Box>
          <Box style={sx({ minWidth: 0, flex: 1 })}>
            <Typography style={sx({ fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#7c6faa' })}>
              {label}
            </Typography>
            <Typography style={sx({ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.2, color: '#1e1b4b', fontVariantNumeric: 'tabular-nums' })}>
              {value}
            </Typography>
            {hint && (
              <Typography style={sx({ fontSize: '0.68rem', color: '#7c6faa' })}>{hint}</Typography>
            )}
          </Box>
          {typeof progress === 'number' && !Number.isNaN(progress) && (
            <ProgressRing
              value={progress}
              size={54}
              stroke={5}
              color={progress >= 85 ? '#047857' : progress >= 70 ? '#7c3aed' : '#b45309'}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

/* --------------------------------------------------------------------------- */

const StudentRecordPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [confirm, ConfirmDialog] = useConfirm();
  const { canEdit, canDelete } = usePermissions();

  const [tabIndex, setTabIndex] = useState(0);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // FIX (2026-09-17, "área de documentos del estudiante"): la pestaña de
  // Documentos solo dejaba hacer clic en la fila para ir al formulario de
  // metadatos — no había previsualizar, descargar ni eliminar desde aquí,
  // aunque esas acciones sí existían en el módulo general de Documentos.
  const [previewDoc, setPreviewDoc] = useState(null);
  const [docActionError, setDocActionError] = useState(null);

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: '', reason: '', observation: '' });
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState(null);

  const loadRecord = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await studentsApi.getFullRecord(id);
      setRecord(response?.data || response);
    } catch (err) {
      console.error('Error loading student record:', err);
      setError(err.message || 'Error loading student record');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRecord();
  }, [loadRecord]);

  const handleOpenStatusDialog = () => {
    setStatusForm({ status: record?.student?.status || '', reason: '', observation: '' });
    setStatusError(null);
    setStatusDialogOpen(true);
  };

  const handleStatusChange = async () => {
    if (!statusForm.status) return;
    setStatusSaving(true);
    setStatusError(null);
    try {
      await studentsApi.updateStatus(id, statusForm);
      setStatusDialogOpen(false);
      await loadRecord();
    } catch (err) {
      setStatusError(err.message || 'Error updating status');
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDownloadDocument = async (doc) => {
    setDocActionError(null);
    try {
      await documentsApi.download(doc.id, doc.file_name);
    } catch (err) {
      setDocActionError(err.message);
    }
  };

  const handleDeleteDocument = async (doc) => {
    const ok = await confirm(t('documents.confirmDeleteDocument'), {
      confirmText: t('common.delete'),
      confirmColor: 'error',
    });
    if (!ok) return;
    setDocActionError(null);
    try {
      await documentsApi.delete(doc.id);
      await loadRecord();
    } catch (err) {
      setDocActionError(err.message);
    }
  };

  // record?.student.photo_url ya no es una URL pública (ver backend/src/app.js);
  // se pide con el token vía GET /students/:id/photo. Se llama antes que los
  // early-returns de loading/error para no romper el orden de los hooks.
  const { blobUrl: photoBlobUrl } = useAuthImage(record?.student?.photo_url ? `/students/${id}/photo` : null);

  /* ---- Derivaciones (todas antes de los early-returns: orden de hooks) ---- */

  const student = record?.student;

  /** Edad cumplida, calculada desde la fecha de nacimiento. */
  const age = useMemo(() => {
    if (!student?.date_of_birth) return null;
    const dob = new Date(student.date_of_birth);
    if (Number.isNaN(dob.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years -= 1;
    return years >= 0 ? years : null;
  }, [student?.date_of_birth]);

  const fullName = useMemo(() => {
    if (!student) return '';
    return [student.first_name, student.middle_name, student.last_name, student.second_last_name]
      .filter(Boolean)
      .join(' ');
  }, [student]);

  const initials = useMemo(() => {
    if (!student) return '';
    return `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`.toUpperCase();
  }, [student]);

  /**
   * Alertas médicas que un docente debe conocer de un vistazo (alergias,
   * condiciones, medicación).
   *
   * FIX (2026-09-19): este `useMemo` estaba declarado DESPUÉS de los
   * early-returns de `loading` / `error`, así que en el primer render (cuando
   * `loading` es true y el componente sale antes) no llegaba a ejecutarse y en
   * el render siguiente React sí lo encontraba: «Rendered more hooks than
   * during the previous render» y la página quedaba COMPLETAMENTE EN BLANCO.
   * Los hooks van siempre antes de cualquier `return` condicional.
   */
  const medicalAlerts = useMemo(() => {
    const medical = record?.medical_record;
    if (!medical) return [];
    const clean = (v) => (v || '').trim();
    const isNone = (v) => /^(none|ninguna|ninguno|n\/a|-)?$/i.test(clean(v));
    const out = [];
    if (clean(medical.allergies) && !isNone(medical.allergies)) {
      out.push({ label: 'Allergies', value: medical.allergies });
    }
    if (clean(medical.medical_condition) && !isNone(medical.medical_condition)) {
      out.push({ label: 'Medical condition', value: medical.medical_condition });
    }
    if (clean(medical.medications) && !isNone(medical.medications)) {
      out.push({ label: 'Medications', value: medical.medications });
    }
    return out;
  }, [record?.medical_record]);

  if (loading) {
    return (
      <Box style={sx({ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' })}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !record?.student) {
    return (
      <Box style={sx({ p: 3 })}>
        <Alert severity="error">{error || 'Student record not found'}</Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/students')} style={sx({ mt: 2 })}>
          {t('students.backToList')}
        </Button>
      </Box>
    );
  }

  const {
    guardians = [],
    medical_record: medical,
    scholarships = [],
    documents = [],
    academic_history: history = [],
    grades = [],
    previous_schools: previousSchools = [],
    status_history: statusHistory = [],
    attendance = { records: [], totals: {}, total_records: 0, attendance_rate: null },
    credits = { records: [], total_earned: 0, total_attempted: 0 },
    gpa = { records: [], cumulative_gpa: null, current_gpa: null },
  } = record;

  const attendanceTotals = attendance.totals || {};
  const attendanceRate = attendance.attendance_rate;
  const cumulativeGpa = gpa.cumulative_gpa;
  const hasGrades = (gpa.records?.length || 0) > 0 || cumulativeGpa !== null;

  /** Tutor de emergencia / tutor principal, para la vista general. */
  const priorityGuardian =
    guardians.find((g) => g.is_emergency_contact) || guardians.find((g) => g.is_primary) || guardians[0] || null;

  const guardianName = (g) =>
    g.full_name || [g.first_name, g.last_name].filter(Boolean).join(' ') || '—';

  const docsCount = documents.length;
  const creditsEarned = Number(credits.total_earned || 0);

  return (
    <Box style={sx({ p: { xs: 2, md: 3 } })} className="print-record">
      {/* ==================== Cabecera del expediente ==================== */}
      <Paper
        style={sx({
          mb: 3,
          borderRadius: '14px',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #2d1b69 55%, #6d28d9 100%)',
          color: '#FFF',
        })}
        className="no-print-bg"
      >
        <Box style={sx({ p: { xs: 2.5, md: 3 } })}>
          <Box style={sx({ display: 'flex', alignItems: 'flex-start', gap: { xs: 2, md: 3 }, flexWrap: 'wrap' })}>
            {/* Foto del estudiante */}
            <Box style={sx({ position: 'relative', flexShrink: 0 })}>
              <Avatar
                src={photoBlobUrl || undefined}
                style={sx({
                  width: 104,
                  height: 104,
                  bgcolor: '#ede9fe',
                  color: '#4c1d95',
                  fontSize: '2.25rem',
                  fontWeight: 800,
                  border: '3px solid rgba(255,255,255,0.85)',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
                })}
              >
                {!photoBlobUrl && initials}
              </Avatar>
              <Box
                style={sx({
                  position: 'absolute',
                  bottom: -6,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  px: 1,
                  py: 0.25,
                  borderRadius: '999px',
                  background: '#FFF',
                  color: '#4c1d95',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                })}
              >
                {student.code}
              </Box>
            </Box>

            {/* Identidad */}
            <Box style={sx({ minWidth: 0, flex: '1 1 320px' })}>
              <Box style={sx({ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mt: 0.5 })}>
                <Typography variant="h5" style={sx({ fontWeight: 800, color: '#fff', lineHeight: 1.25 })}>
                  {fullName}
                </Typography>
                <Chip
                  label={t(`status.${student.status?.toLowerCase()}`, { defaultValue: student.status })}
                  size="small"
                  color={STATUS_COLOR[student.status] || 'default'}
                  style={sx({ fontWeight: 700 })}
                />
              </Box>

              <Typography style={sx({ color: 'rgba(255,255,255,0.88)', mt: 0.75, fontSize: '0.875rem' })}>
                <strong>{student.grade || '—'}</strong>
                {student.section ? ` · ${t('students.section')} ${student.section}` : ''}
                {student.academic_year_id ? ` · ${t('students.academicYear') || 'Academic year'} #${student.academic_year_id}` : ''}
              </Typography>

              {/* Metadatos rápidos en la propia cabecera */}
              <Box style={sx({ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.5 })}>
                {[
                  { icon: IdIcon, label: t('students.identificationNumber'), value: student.identification_number || null },
                  { icon: AgeIcon, label: t('students.age') || 'Age', value: age !== null ? `${age}` : null },
                  { icon: BirthdayIcon, label: t('students.dateOfBirth'), value: student.date_of_birth ? formatDate(student.date_of_birth) : null },
                  { icon: MailIcon, label: t('students.email'), value: student.email || null },
                  { icon: PhoneIcon, label: t('students.phone'), value: student.phone || null },
                ].map(({ icon: Icon, label, value }) => (
                  <Box key={label} style={sx({ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 })}>
                    <Icon size={14} style={{ opacity: 0.75, flexShrink: 0 }} />
                    <Box style={sx({ minWidth: 0 })}>
                      <Typography style={sx({ display: 'block', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.6)', lineHeight: 1.2 })}>
                        {label}
                      </Typography>
                      <Typography style={sx({ fontSize: '0.78rem', fontWeight: 600, color: value ? '#fff' : 'rgba(255,255,255,0.5)', lineHeight: 1.3 })}>
                        {value || t('students.notRegistered') || 'Not registered'}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Acciones — se conservan todas */}
            <Box
              style={sx({ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' })}
              className="no-print"
            >
              <Button
                variant="contained"
                style={sx({ bgcolor: '#FFF', color: '#6d28d9', '&:hover': { bgcolor: 'rgba(124,58,237,0.06)' } })}
                startIcon={<EditIcon />}
                onClick={() => navigate(`/students/${student.id}/edit`)}
              >
                {t('common.edit')}
              </Button>
              <Button
                variant="outlined"
                style={sx({ color: '#FFF', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: '#ddd6fe', bgcolor: 'rgba(255,255,255,0.1)' } })}
                startIcon={<StatusIcon />}
                onClick={handleOpenStatusDialog}
              >
                {t('students.changeStatus')}
              </Button>
              <Button
                variant="outlined"
                style={sx({ color: '#FFF', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: '#ddd6fe', bgcolor: 'rgba(255,255,255,0.1)' } })}
                startIcon={<PrintIcon />}
                onClick={() => window.print()}
              >
                {t('students.print')}
              </Button>
              <Button
                variant="outlined"
                style={sx({ color: '#FFF', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: '#ddd6fe', bgcolor: 'rgba(255,255,255,0.1)' } })}
                startIcon={<BackIcon />}
                onClick={() => navigate('/students')}
              >
                {t('common.back')}
              </Button>
            </Box>
          </Box>

          {/* Alertas médicas: visibles sin abrir la pestaña de salud */}
          {medicalAlerts.length > 0 && (
            <Box
              style={sx({
                mt: 2,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                p: 1.5,
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.25)',
              })}
            >
              <WarningIcon size={16} style={{ marginTop: 2, flexShrink: 0 }} />
              <Typography style={sx({ fontSize: '0.78rem', color: '#fff', lineHeight: 1.5 })}>
                <strong>{t('students.medicalAlert') || 'Medical alert'}: </strong>
                {medicalAlerts.map((a) => `${a.label}: ${a.value}`).join(' · ')}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* ==================== Resumen del expediente ==================== */}
      <Grid container spacing={2} style={sx({ mb: 3 })}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <SummaryTile
            icon={RateIcon}
            label={t('students.attendanceRate')}
            value={attendanceRate !== null && attendanceRate !== undefined ? `${attendanceRate}%` : '—'}
            hint={
              attendance.total_records
                ? t('students.attendanceRecords', { count: attendance.total_records })
                : t('students.noAttendanceYet') || 'No records yet'
            }
            tone={
              attendanceRate === null || attendanceRate === undefined
                ? 'slate'
                : attendanceRate >= 85
                  ? 'green'
                  : attendanceRate >= 70
                    ? 'brand'
                    : 'amber'
            }
            progress={attendanceRate === null || attendanceRate === undefined ? undefined : attendanceRate}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <SummaryTile
            icon={GpaIcon}
            label={t('students.cumulativeGpa')}
            value={hasGrades ? Number(cumulativeGpa ?? gpa.current_gpa ?? 0).toFixed(2) : '—'}
            hint={hasGrades ? t('students.outOf4') || 'out of 4.00' : t('students.noGpaYet') || 'No grades recorded'}
            tone={hasGrades ? 'brand' : 'slate'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <SummaryTile
            icon={CreditsIcon}
            label={t('students.creditsEarned')}
            value={creditsEarned.toFixed(2)}
            hint={
              credits.total_attempted
                ? `${creditsEarned.toFixed(2)} / ${Number(credits.total_attempted).toFixed(2)} ${t('students.creditsAttempted') || 'attempted'}`
                : t('students.noCreditsYet') || 'No credits recorded'
            }
            tone={creditsEarned > 0 ? 'green' : 'slate'}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <SummaryTile
            icon={DocsIcon}
            label={t('students.documents')}
            value={docsCount}
            hint={docsCount ? t('students.filesOnRecord') || 'files on record' : t('students.noDocumentsYet') || 'No documents yet'}
            tone={docsCount ? 'brand' : 'slate'}
          />
        </Grid>
      </Grid>

      {/* ==================== Pestañas ==================== */}
      <Paper style={sx({ mb: 3, borderRadius: '12px', border: '1px solid #ddd6fe', overflow: 'hidden' })} className="no-print">
        <Tabs
          value={tabIndex}
          onChange={(e, val) => setTabIndex(val)}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          style={sx({ px: 1 })}
        >
          <Tab icon={<PersonIcon size={16} />} label={t('students.overview')} iconPosition="start" style={sx({ minHeight: 56, textTransform: 'none', fontWeight: 600 })} />
          <Tab icon={<AcademicIcon size={16} />} label={t('students.academic')} iconPosition="start" style={sx({ minHeight: 56, textTransform: 'none', fontWeight: 600 })} />
          <Tab
            icon={<AttendanceIcon size={16} />}
            label={attendance.total_records ? `${t('students.attendance')} (${attendance.total_records})` : t('students.attendance')}
            iconPosition="start"
            style={sx({ minHeight: 56, textTransform: 'none', fontWeight: 600 })}
          />
          <Tab
            icon={<GuardiansIcon size={16} />}
            label={guardians.length ? `${t('students.guardians')} (${guardians.length})` : t('students.guardians')}
            iconPosition="start"
            style={sx({ minHeight: 56, textTransform: 'none', fontWeight: 600 })}
          />
          <Tab
            icon={<DocsIcon size={16} />}
            label={docsCount ? `${t('students.documents')} (${docsCount})` : t('students.documents')}
            iconPosition="start"
            style={sx({ minHeight: 56, textTransform: 'none', fontWeight: 600 })}
          />
          <Tab icon={<MedicalIcon size={16} />} label={t('students.medical')} iconPosition="start" style={sx({ minHeight: 56, textTransform: 'none', fontWeight: 600 })} />
          <Tab
            icon={<ScholarshipIcon size={16} />}
            label={scholarships.length ? `${t('students.scholarships')} (${scholarships.length})` : t('students.scholarships')}
            iconPosition="start"
            style={sx({ minHeight: 56, textTransform: 'none', fontWeight: 600 })}
          />
          <Tab
            icon={<GradesIcon size={16} />}
            label={history.length ? `${t('students.history')} (${history.length})` : t('students.history')}
            iconPosition="start"
            style={sx({ minHeight: 56, textTransform: 'none', fontWeight: 600 })}
          />
          <Tab
            icon={<PreviousSchoolIcon size={16} />}
            label={previousSchools.length ? `${t('students.previousSchools')} (${previousSchools.length})` : t('students.previousSchools')}
            iconPosition="start"
            style={sx({ minHeight: 56, textTransform: 'none', fontWeight: 600 })}
          />
          <Tab icon={<HistoryIcon size={16} />} label={t('students.changeStatus')} iconPosition="start" style={sx({ minHeight: 56, textTransform: 'none', fontWeight: 600 })} />
        </Tabs>
      </Paper>

      {/* ==================== 1. Vista general ==================== */}
      {tabIndex === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <RecordCard title={t('students.personalInfo')} icon={PersonIcon}>
              <InfoRow icon={IdIcon} label={t('students.identificationNumber')} value={student.identification_number} mono />
              <InfoRow icon={PersonIcon} label={t('students.gender') || 'Gender'} value={student.gender} />
              <InfoRow icon={BirthdayIcon} label={t('students.dateOfBirth')} value={student.date_of_birth ? formatDate(student.date_of_birth) : null} />
              <InfoRow icon={AgeIcon} label={t('students.age') || 'Age'} value={age !== null ? `${age} ${t('students.years') || 'years'}` : null} />
              <InfoRow icon={MailIcon} label={t('students.email')} value={student.email} />
              <InfoRow icon={PhoneIcon} label={t('students.phone')} value={student.phone} />
              <InfoRow icon={AddressIcon} label={t('students.address')} value={student.address} />
            </RecordCard>
          </Grid>

          <Grid size={{ xs: 12, md: 6, lg: 4 }}>
            <RecordCard title={t('students.academicInfo')} icon={AcademicIcon}>
              <InfoRow icon={IdIcon} label={t('students.code')} value={student.code} mono />
              <InfoRow icon={AcademicIcon} label={t('students.grade')} value={student.grade} emphasis />
              <InfoRow label={t('students.section')} value={student.section} />
              <InfoRow
                icon={RateIcon}
                label={t('students.enrollmentDate')}
                value={student.enrollment_date ? formatDate(student.enrollment_date) : null}
              />
              <InfoRow
                icon={GpaIcon}
                label={t('students.cumulativeGpa')}
                value={hasGrades ? `${Number(cumulativeGpa ?? gpa.current_gpa ?? 0).toFixed(2)} / 4.00` : t('students.noGpaYet') || 'No grades recorded'}
                emphasis={hasGrades}
              />
              <InfoRow
                icon={CreditsIcon}
                label={t('students.creditsEarned')}
                value={t('students.creditsValue', { value: creditsEarned.toFixed(2) })}
                emphasis={creditsEarned > 0}
              />
              <InfoRow label={t('students.graduationYear')} value={student.graduation_year} />
            </RecordCard>
          </Grid>

          <Grid size={{ xs: 12, md: 12, lg: 4 }}>
            <RecordCard
              title={t('students.emergencyContact') || 'Emergency contact'}
              icon={EmergencyIcon}
              action={
                <Button size="small" variant="outlined" onClick={() => navigate(`/guardians/new?studentId=${student.id}`)}>
                  + {t('common.add')}
                </Button>
              }
            >
              {priorityGuardian ? (
                <>
                  <Box style={sx({ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 })}>
                    <Avatar style={sx({ width: 40, height: 40, bgcolor: '#ede9fe', color: '#6d28d9', fontWeight: 700, fontSize: '0.9rem' })}>
                      {`${priorityGuardian.first_name?.[0] || ''}${priorityGuardian.last_name?.[0] || ''}`.toUpperCase()}
                    </Avatar>
                    <Box style={sx({ minWidth: 0 })}>
                      <Typography style={sx({ fontWeight: 700, color: '#1e1b4b', lineHeight: 1.25 })}>
                        {guardianName(priorityGuardian)}
                      </Typography>
                      <Box style={sx({ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 })}>
                        <Chip size="small" label={priorityGuardian.relationship || 'Guardian'} />
                        {(priorityGuardian.is_emergency_contact === 1 || priorityGuardian.is_emergency_contact === true) && (
                          <Chip size="small" label={t('students.emergency') || 'Emergency'} color="primary" />
                        )}
                        {(priorityGuardian.is_primary === 1 || priorityGuardian.is_primary === true) && (
                          <Chip size="small" label={t('students.primary') || 'Primary'} />
                        )}
                      </Box>
                    </Box>
                  </Box>
                  <InfoRow icon={PhoneIcon} label={t('students.phone')} value={priorityGuardian.phone} emphasis />
                  {priorityGuardian.secondary_phone && (
                    <InfoRow icon={PhoneIcon} label={t('students.secondaryPhone') || 'Secondary phone'} value={priorityGuardian.secondary_phone} />
                  )}
                  <InfoRow icon={MailIcon} label={t('students.email')} value={priorityGuardian.email} />
                  <InfoRow icon={AddressIcon} label={t('students.address')} value={priorityGuardian.address} />
                  {guardians.length > 1 && (
                    <Typography style={sx({ mt: 1, fontSize: '0.72rem', color: '#7c6faa' })}>
                      {t('students.moreGuardians', { count: guardians.length - 1 }) || `+${guardians.length - 1} more in the Guardians tab`}
                    </Typography>
                  )}
                </>
              ) : (
                <EmptyBlock
                  icon={GuardiansIcon}
                  title={t('students.noGuardians') || 'No guardians associated'}
                  description={t('students.noGuardiansDesc') || 'Register a parent or guardian so the school has an emergency contact on file.'}
                />
              )}
            </RecordCard>
          </Grid>

          {student.notes && (
            <Grid size={{ xs: 12 }}>
              <RecordCard title={t('students.notes')} icon={DocsIcon}>
                <Typography variant="body2" style={sx({ color: '#3f3a63', lineHeight: 1.7, whiteSpace: 'pre-wrap' })}>
                  {student.notes}
                </Typography>
              </RecordCard>
            </Grid>
          )}
        </Grid>
      )}

      {/* ==================== 2. Académico y calificaciones ==================== */}
      {tabIndex === 1 && (
        <Paper style={sx({ p: 3, borderTop: '4px solid', borderColor: 'primary.main', borderRadius: '12px' })}>
          <Typography variant="h6" style={sx({ color: '#1e1b4b', fontWeight: 700, mb: 2 })}>{t('students.grades')}</Typography>
          {grades.length === 0 ? (
            <EmptyBlock
              icon={GradesIcon}
              title={t('students.noGrades') || 'No grades recorded yet'}
              description={t('students.noGradesDesc') || 'Grades appear here once the gradebook for this student is published.'}
            />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead style={sx({ bgcolor: '#f5f3ff' })}>
                  <TableRow>
                    <HeadCell>{t('students.subject') || 'Subject'}</HeadCell>
                    <HeadCell>{t('students.period') || 'Period'}</HeadCell>
                    <HeadCell align="center">{t('students.gradeValue') || 'Grade'}</HeadCell>
                    <HeadCell align="center">{t('students.letter') || 'Letter'}</HeadCell>
                    <HeadCell>{t('common.status') || 'Status'}</HeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {grades.map((g) => (
                    <TableRow key={g.id} hover>
                      <TableCell>{g.subject_name || `Subject #${g.subject_id}`}</TableCell>
                      <TableCell>{g.period_name || `Period #${g.academic_period_id}`}</TableCell>
                      <TableCell style={sx({ textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' })}>{g.grade_value}</TableCell>
                      <TableCell style={sx({ textAlign: 'center', fontWeight: 700, color: '#6d28d9' })}>{g.grade_letter || '—'}</TableCell>
                      <TableCell>
                        <Chip size="small" label={g.status || 'DRAFT'} color={g.status === 'LOCKED' ? 'default' : 'primary'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ==================== 3. Asistencia ==================== */}
      {tabIndex === 2 && (
        <Paper style={sx({ p: 3, borderTop: '4px solid', borderColor: 'primary.main', borderRadius: '12px' })}>
          <Typography variant="h6" style={sx({ color: '#1e1b4b', fontWeight: 700, mb: 2 })}>{t('students.attendance')}</Typography>

          <Grid container spacing={2} style={sx({ mb: 3 })}>
            {['P', 'O', 'E', 'U'].map((key) => (
              <Grid key={key} size={{ xs: 6, md: 3 }}>
                <Card variant="outlined" style={sx({ border: `1px solid ${ATTENDANCE_CHIP[key].bg}`, height: '100%' })}>
                  <CardContent style={sx({ textAlign: 'center' })}>
                    <Typography variant="h5" style={sx({ fontWeight: 800, color: ATTENDANCE_CHIP[key].color, fontVariantNumeric: 'tabular-nums' })}>
                      {attendanceTotals[key] || 0}
                    </Typography>
                    <Typography style={sx({ fontSize: '0.7rem', fontWeight: 600, color: '#7c6faa' })}>{ATTENDANCE_CHIP[key].label}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {attendance.records.length === 0 ? (
            <EmptyBlock
              icon={AttendanceIcon}
              title={t('students.noAttendance') || 'No attendance records found'}
              description={t('students.noAttendanceDesc') || "Once attendance is taken for this student's assignments it will be listed here."}
            />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead style={sx({ bgcolor: '#f5f3ff' })}>
                  <TableRow>
                    <HeadCell>{t('students.date') || 'Date'}</HeadCell>
                    <HeadCell>{t('students.assignment') || 'Assignment'}</HeadCell>
                    <HeadCell align="center">{t('common.status') || 'Status'}</HeadCell>
                    <HeadCell>{t('students.notes')}</HeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendance.records.map((att) => (
                    <TableRow key={att.id} hover>
                      <TableCell style={sx({ whiteSpace: 'nowrap' })}>{formatDate(att.date)}</TableCell>
                      <TableCell>{att.assignment_name || `Assignment #${att.assignment_id}`}</TableCell>
                      <TableCell style={sx({ textAlign: 'center' })}>
                        <Chip
                          size="small"
                          label={ATTENDANCE_CHIP[att.status]?.label || att.status}
                          style={sx({ fontWeight: 700, bgcolor: ATTENDANCE_CHIP[att.status]?.bg, color: ATTENDANCE_CHIP[att.status]?.color })}
                        />
                      </TableCell>
                      <TableCell>{att.notes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ==================== 4. Tutores / representantes ==================== */}
      {tabIndex === 3 && (
        <Paper style={sx({ p: 3, borderTop: '4px solid', borderColor: 'primary.main', borderRadius: '12px' })}>
          <Box style={sx({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' })}>
            <Typography variant="h6" style={sx({ color: '#1e1b4b', fontWeight: 700 })}>{t('students.guardians')}</Typography>
            <Button size="small" variant="contained" onClick={() => navigate(`/guardians/new?studentId=${student.id}`)}>
              + {t('common.add')}
            </Button>
          </Box>

          {guardians.length === 0 ? (
            <EmptyBlock
              icon={GuardiansIcon}
              title={t('students.noGuardians') || 'No guardians associated'}
              description={t('students.noGuardiansDesc') || 'Register a parent or guardian so the school has an emergency contact on file.'}
            />
          ) : (
            <Grid container spacing={2}>
              {guardians.map((g) => (
                <Grid key={g.id} size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined" style={sx({ height: '100%', border: '1px solid #ddd6fe' })}>
                    <CardContent>
                      <Box style={sx({ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 })}>
                        <Avatar style={sx({ width: 44, height: 44, bgcolor: '#ede9fe', color: '#6d28d9', fontWeight: 700 })}>
                          {`${g.first_name?.[0] || ''}${g.last_name?.[0] || ''}`.toUpperCase()}
                        </Avatar>
                        <Box style={sx({ minWidth: 0, flex: 1 })}>
                          <Typography variant="subtitle1" style={sx({ fontWeight: 700, color: '#1e1b4b', lineHeight: 1.25 })}>
                            {guardianName(g)}
                          </Typography>
                          <Box style={sx({ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 })}>
                            <Chip size="small" label={g.relationship || 'Guardian'} />
                            {(g.is_primary === 1 || g.is_primary === true) && <Chip size="small" label={t('students.primary') || 'Primary'} color="primary" />}
                            {(g.is_emergency_contact === 1 || g.is_emergency_contact === true) && (
                              <Chip size="small" label={t('students.emergency') || 'Emergency'} color="success" />
                            )}
                            {(g.authorized_pickup === 1 || g.authorized_pickup === true) && (
                              <Chip size="small" label={t('students.authorizedPickup') || 'Authorized pickup'} variant="outlined" />
                            )}
                          </Box>
                        </Box>
                      </Box>
                      <Divider style={sx({ mb: 1, borderColor: '#ede9fe' })} />
                      <InfoRow icon={IdIcon} label={t('students.identification') || 'Identification'} value={g.identification} mono />
                      <InfoRow icon={PhoneIcon} label={t('students.phone')} value={g.phone} emphasis />
                      {g.secondary_phone && <InfoRow icon={PhoneIcon} label={t('students.secondaryPhone') || 'Secondary phone'} value={g.secondary_phone} />}
                      <InfoRow icon={MailIcon} label={t('students.email')} value={g.email} />
                      <InfoRow icon={AddressIcon} label={t('students.address')} value={g.address} />
                      {g.notes && <InfoRow label={t('students.notes')} value={g.notes} />}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}

      {/* ==================== 5. Documentos ==================== */}
      {tabIndex === 4 && (
        <Paper style={sx({ p: 3, borderTop: '4px solid', borderColor: 'primary.main', borderRadius: '12px' })}>
          <Box style={sx({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' })}>
            <Typography variant="h6" style={sx({ color: '#1e1b4b', fontWeight: 700 })}>{t('students.documents')}</Typography>
            <Button size="small" variant="contained" onClick={() => navigate(`/documents/new?studentId=${student.id}`)}>
              + {t('common.add')}
            </Button>
          </Box>

          {docActionError && (
            <Alert severity="error" onClose={() => setDocActionError(null)} style={sx({ mb: 2 })}>
              {docActionError}
            </Alert>
          )}

          {documents.length === 0 ? (
            <EmptyBlock
              icon={DocsIcon}
              title={t('students.noDocuments') || 'No documents uploaded'}
              description={t('students.noDocumentsDesc') || 'Upload birth certificates, identification or medical files so the record is complete.'}
            />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead style={sx({ bgcolor: '#f5f3ff' })}>
                  <TableRow>
                    <HeadCell>{t('documents.code') || 'Code'}</HeadCell>
                    <HeadCell>{t('documents.documentTitle')}</HeadCell>
                    <HeadCell>{t('documents.type') || 'Type'}</HeadCell>
                    <HeadCell>{t('students.date') || 'Date'}</HeadCell>
                    <HeadCell align="right">{t('common.actions')}</HeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {documents.map((d) => (
                    <TableRow key={d.id} hover>
                      <TableCell style={sx({ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem' })}>{d.code}</TableCell>
                      <TableCell>{d.title || d.file_name}</TableCell>
                      <TableCell>
                        <Chip size="small" label={d.document_type} variant="outlined" />
                      </TableCell>
                      <TableCell style={sx({ whiteSpace: 'nowrap' })}>{formatDate(d.upload_date || d.created_at)}</TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title={t('documents.preview')}>
                          <IconButton size="small" onClick={() => setPreviewDoc(d)}>
                            <PreviewIcon size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('common.download')}>
                          <IconButton size="small" onClick={() => handleDownloadDocument(d)}>
                            <DownloadIcon size={16} />
                          </IconButton>
                        </Tooltip>
                        {canEdit('documents') && (
                          <Tooltip title={t('common.edit')}>
                            <IconButton size="small" onClick={() => navigate(`/documents/${d.id}/edit`)}>
                              <EditIcon size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {canDelete('documents') && (
                          <Tooltip title={t('common.delete')}>
                            <IconButton size="small" color="error" onClick={() => handleDeleteDocument(d)}>
                              <DeleteIcon size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ==================== 6. Expediente médico ==================== */}
      {tabIndex === 5 && (
        <Paper style={sx({ p: 3, borderTop: '4px solid', borderColor: 'primary.main', borderRadius: '12px' })}>
          <Box style={sx({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' })}>
            <Typography variant="h6" style={sx({ color: '#1e1b4b', fontWeight: 700 })}>{t('students.medical')}</Typography>
            <Button
              size="small"
              variant={medical ? 'outlined' : 'contained'}
              onClick={() => navigate(medical ? `/medical-records/${medical.id}/edit` : `/medical-records/new?studentId=${student.id}`)}
            >
              {medical ? t('common.edit') : `+ ${t('common.add')}`}
            </Button>
          </Box>

          {medical ? (
            <>
              {medicalAlerts.length > 0 && (
                <Alert severity="warning" icon={<AlertIcon size={18} />} style={sx({ mb: 2 })}>
                  <strong>{t('students.medicalAlert') || 'Medical alert'}: </strong>
                  {medicalAlerts.map((a) => `${a.label}: ${a.value}`).join(' · ')}
                </Alert>
              )}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <RecordCard title={t('students.healthInfo') || 'Health information'} icon={MedicalIcon}>
                    <InfoRow label={t('medicalRecords.medicalCondition') || 'Medical conditions'} value={medical.medical_condition} />
                    <InfoRow label={t('medicalRecords.allergies') || 'Allergies'} value={medical.allergies} />
                    <InfoRow label={t('medicalRecords.medications') || 'Medications'} value={medical.medications} />
                  </RecordCard>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <RecordCard title={t('students.insuranceAndEmergency') || 'Insurance & emergency'} icon={EmergencyIcon}>
                    <InfoRow label={t('medicalRecords.healthInsurance') || 'Health insurance'} value={medical.health_insurance} />
                    <InfoRow label={t('medicalRecords.insuranceNumber') || 'Insurance number'} value={medical.insurance_number} mono />
                    <InfoRow label={t('medicalRecords.emergencyContact') || 'Emergency contact'} value={medical.emergency_contact_name} emphasis />
                    <InfoRow icon={PhoneIcon} label={t('students.phone')} value={medical.emergency_contact_phone} />
                  </RecordCard>
                </Grid>
              </Grid>
            </>
          ) : (
            <EmptyBlock
              icon={MedicalIcon}
              title={t('students.noMedicalRecord') || 'No medical record registered'}
              description={t('students.noMedicalRecordDesc') || 'Record allergies, conditions and the insurance details to keep the file complete.'}
            />
          )}
        </Paper>
      )}

      {/* ==================== 7. Becas ==================== */}
      {tabIndex === 6 && (
        <Paper style={sx({ p: 3, borderTop: '4px solid', borderColor: 'primary.main', borderRadius: '12px' })}>
          <Typography variant="h6" style={sx({ color: '#1e1b4b', fontWeight: 700, mb: 2 })}>{t('students.scholarships')}</Typography>
          {scholarships.length === 0 ? (
            <EmptyBlock
              icon={ScholarshipIcon}
              title={t('students.noScholarships') || 'No scholarships recorded'}
              description={t('students.noScholarshipsDesc') || 'Scholarships, grants and discounts awarded to this student will appear here.'}
            />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead style={sx({ bgcolor: '#f5f3ff' })}>
                  <TableRow>
                    <HeadCell>{t('scholarships.code') || 'Code'}</HeadCell>
                    <HeadCell>{t('scholarships.type') || 'Type'}</HeadCell>
                    <HeadCell align="center">{t('scholarships.percentage') || 'Percentage'}</HeadCell>
                    <HeadCell>{t('common.status') || 'Status'}</HeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scholarships.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell style={sx({ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem' })}>{s.code}</TableCell>
                      <TableCell>{s.scholarship_type}</TableCell>
                      <TableCell style={sx({ textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' })}>
                        {s.percentage ? `${s.percentage}%` : s.amount ? `$${s.amount}` : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={s.status} color="primary" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ==================== 8. Historial académico ==================== */}
      {tabIndex === 7 && (
        <Paper style={sx({ p: 3, borderTop: '4px solid', borderColor: 'primary.main', borderRadius: '12px' })}>
          <Typography variant="h6" style={sx({ color: '#1e1b4b', fontWeight: 700, mb: 2 })}>{t('students.history')}</Typography>
          {history.length === 0 ? (
            <EmptyBlock
              icon={HistoryIcon}
              title={t('students.noHistory') || 'No historical records available'}
              description={t('students.noHistoryDesc') || 'Completed academic years and transferred subjects will be listed here.'}
            />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead style={sx({ bgcolor: '#f5f3ff' })}>
                  <TableRow>
                    <HeadCell>{t('students.academicYear') || 'Year'}</HeadCell>
                    <HeadCell>{t('students.subject') || 'Subject'}</HeadCell>
                    <HeadCell align="center">{t('students.gradeValue') || 'Grade'}</HeadCell>
                    <HeadCell align="center">{t('students.credits') || 'Credits'}</HeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((h) => (
                    <TableRow key={h.id} hover>
                      <TableCell>{h.academic_year_name || '—'}</TableCell>
                      <TableCell>{h.subject_name || `Subject #${h.subject_id}`}</TableCell>
                      <TableCell style={sx({ textAlign: 'center', fontWeight: 700, fontVariantNumeric: 'tabular-nums' })}>{h.final_grade}</TableCell>
                      <TableCell style={sx({ textAlign: 'center' })}>{h.credits || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ==================== 9. Escuelas anteriores ==================== */}
      {tabIndex === 8 && (
        <Paper style={sx({ p: 3, borderTop: '4px solid', borderColor: 'primary.main', borderRadius: '12px' })}>
          <Box style={sx({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' })}>
            <Typography variant="h6" style={sx({ color: '#1e1b4b', fontWeight: 700 })}>{t('students.previousSchools')}</Typography>
            <Button size="small" variant="contained" onClick={() => navigate(`/previous-schools/new?studentId=${student.id}`)}>
              + {t('common.add')}
            </Button>
          </Box>

          {previousSchools.length === 0 ? (
            <EmptyBlock
              icon={PreviousSchoolIcon}
              title={t('students.noPreviousSchools')}
              description={t('students.noPreviousSchoolsDesc') || 'Schools attended before enrolling here, and any transferred credits, will appear in this section.'}
            />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead style={sx({ bgcolor: '#f5f3ff' })}>
                  <TableRow>
                    <HeadCell>{t('students.schoolName')}</HeadCell>
                    <HeadCell>{t('students.location')}</HeadCell>
                    <HeadCell>{t('students.yearsAttended')}</HeadCell>
                    <HeadCell align="center">{t('students.creditsTransferred')}</HeadCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previousSchools.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell>{s.school_name}</TableCell>
                      <TableCell>{s.location || '—'}</TableCell>
                      <TableCell>{s.years_attended || '—'}</TableCell>
                      <TableCell style={sx({ textAlign: 'center' })}>{s.credits_transferred ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ==================== 10. Historial de estados ==================== */}
      {tabIndex === 9 && (
        <Paper style={sx({ p: 3, borderTop: '4px solid', borderColor: 'primary.main', borderRadius: '12px' })}>
          <Typography variant="h6" style={sx({ color: '#1e1b4b', fontWeight: 700, mb: 2 })}>
            {t('students.changeStatus')} — {t('students.history')}
          </Typography>

          {statusHistory.length === 0 ? (
            <EmptyBlock
              icon={HistoryIcon}
              title={t('students.noStatusChanges') || 'No status changes recorded'}
              description={t('students.noStatusChangesDesc') || 'Every enrolment status change is logged here with its reason and the responsible user.'}
            />
          ) : (
            <Box style={sx({ position: 'relative', pl: 3 })}>
              {/* Guía vertical del timeline */}
              <Box style={sx({ position: 'absolute', left: 9, top: 6, bottom: 6, width: 2, background: '#ede9fe' })} />
              {statusHistory.map((s) => (
                <Box key={s.id} style={sx({ position: 'relative', pb: 2.5 })}>
                  <Box
                    style={sx({
                      position: 'absolute',
                      left: -21,
                      top: 6,
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: '#7c3aed',
                      border: '2px solid #fff',
                      boxShadow: '0 0 0 2px #ede9fe',
                    })}
                  />
                  <Box style={sx({ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' })}>
                    {s.from_status ? <Chip size="small" label={s.from_status} /> : null}
                    {s.from_status ? <Typography style={sx({ color: '#a99bd0' })}>→</Typography> : null}
                    <Chip size="small" color={STATUS_COLOR[s.to_status] || 'default'} label={s.to_status} style={sx({ fontWeight: 700 })} />
                    <Typography style={sx({ fontSize: '0.72rem', color: '#7c6faa', ml: 0.5 })}>{formatDate(s.created_at)}</Typography>
                  </Box>
                  {s.reason && (
                    <Typography variant="body2" style={sx({ mt: 0.75, color: '#3f3a63' })}>
                      {s.reason}
                    </Typography>
                  )}
                  {s.changed_by_name && (
                    <Typography style={sx({ fontSize: '0.72rem', color: '#7c6faa', mt: 0.25 })}>
                      {t('students.changedBy') || 'Changed by'}: {s.changed_by_name}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {/* ==================== Diálogo de cambio de estado ==================== */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{t('students.changeStatus')}</DialogTitle>
        <DialogContent>
          {statusError && <Alert severity="error" style={sx({ mb: 2 })}>{statusError}</Alert>}
          <FormControl fullWidth style={sx({ mt: 1, mb: 2 })}>
            <InputLabel>{t('students.status')}</InputLabel>
            <Select
              label={t('students.status')}
              value={statusForm.status}
              onChange={(e) => setStatusForm((p) => ({ ...p, status: e.target.value }))}
            >
              {['ACTIVE', 'INACTIVE', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED', 'SUSPENDED'].map((s) => (
                <MenuItem key={s} value={s}>{t(`status.${s.toLowerCase()}`)}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label={t('students.reason')}
            value={statusForm.reason}
            onChange={(e) => setStatusForm((p) => ({ ...p, reason: e.target.value }))}
            style={sx({ mb: 2 })}
          />
          <TextField
            fullWidth
            multiline
            rows={3}
            label={t('students.observation')}
            value={statusForm.observation}
            onChange={(e) => setStatusForm((p) => ({ ...p, observation: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            disabled={statusSaving || !statusForm.status || statusForm.status === student.status}
            onClick={handleStatusChange}
          >
            {statusSaving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <DocumentPreviewDialog
        open={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        documentId={previewDoc?.id}
        mimeType={previewDoc?.mime_type}
        fileName={previewDoc?.file_name}
        title={previewDoc?.title}
      />
      {ConfirmDialog}
    </Box>
  );
};

export default StudentRecordPage;
