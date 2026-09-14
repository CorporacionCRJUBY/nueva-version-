// FILE: frontend/src/features/students/pages/StudentRecordPage.jsx
import { sx } from '../../../ui/sx';
import React, { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import { ArrowLeft as BackIcon, Pencil as EditIcon, User as PersonIcon, School as AcademicIcon, CalendarCheck as AttendanceIcon, GraduationCap as GradesIcon, History as HistoryIcon, Contact as GuardiansIcon, FolderOpen as DocsIcon, HeartPulse as MedicalIcon, Star as ScholarshipIcon, Printer as PrintIcon, ArrowLeftRight as StatusIcon, Building as PreviousSchoolIcon } from 'lucide-react';
import studentsApi from '../api';
import useAuthImage from '../../../hooks/useAuthImage';
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
  O: { label: 'Online (O)', bg: 'rgba(120,71,227,0.12)', color: '#6532c4' },
  E: { label: 'Excused (E)', bg: 'rgba(180,83,9,0.12)', color: '#b45309' },
  U: { label: 'Unexcused (U)', bg: 'rgba(185,28,28,0.12)', color: '#b91c1c' },
};

const StudentRecordPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [tabIndex, setTabIndex] = useState(0);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // record?.student.photo_url ya no es una URL pública (ver backend/src/app.js);
  // se pide con el token vía GET /students/:id/photo. Se llama antes que los
  // early-returns de loading/error para no romper el orden de los hooks.
  const { blobUrl: photoBlobUrl } = useAuthImage(record?.student?.photo_url ? `/students/${id}/photo` : null);

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
    student,
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

  return (
    <Box style={sx({ p: 3 })} className="print-record">
      {/* Header Profile Card */}
      <Paper style={sx({ p: 3, mb: 3, borderRadius: 3, background: 'linear-gradient(135deg, #241046 0%, #2f1657 55%, #6532c4 100%)', color: '#FFF' })} className="no-print-bg">
        <Box style={sx({ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 })}>
          <Box style={sx({ display: 'flex', gap: 3, alignItems: 'center' })}>
            <Avatar src={photoBlobUrl || undefined} style={sx({ width: 80, height: 80, bgcolor: '#f0ebff', color: '#3d1c76', fontSize: '2rem', fontWeight: 'bold' })}>
              {!photoBlobUrl && `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`}
            </Avatar>
            <Box>
              <Box style={sx({ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' })}>
                <Typography variant="h4" style={sx([{ fontWeight: 700, color: '#ffffff' }, { fontWeight: 800 }])}>
                  {student.first_name} {student.middle_name || ''} {student.last_name} {student.second_last_name || ''}
                </Typography>
                <Chip label={t(`status.${student.status?.toLowerCase()}`, { defaultValue: student.status })} size="small" color={STATUS_COLOR[student.status] || 'default'} style={sx({ fontWeight: 'bold' })} />
              </Box>
              <Typography variant="subtitle1" style={sx({ color: 'rgba(255,255,255,0.94)' })}>
                {t('students.code')}: <strong>{student.code}</strong> | {t('students.grade')}: <strong>{student.grade}</strong> | {t('students.section')}: <strong>{student.section || '-'}</strong>
              </Typography>
            </Box>
          </Box>
          <Box style={sx({ display: 'flex', gap: 1, flexWrap: 'wrap' })} className="no-print">
            <Button variant="contained" style={sx({ bgcolor: '#FFF', color: '#6532c4', '&:hover': { bgcolor: 'rgba(120,71,227,0.06)' } })} startIcon={<EditIcon />} onClick={() => navigate(`/students/${student.id}/edit`)}>
              {t('common.edit')}
            </Button>
            <Button variant="outlined" style={sx({ color: '#FFF', borderColor: '#FFF', '&:hover': { borderColor: '#e3dbff', bgcolor: 'rgba(255,255,255,0.1)' } })} startIcon={<StatusIcon />} onClick={handleOpenStatusDialog}>
              {t('students.changeStatus')}
            </Button>
            <Button variant="outlined" style={sx({ color: '#FFF', borderColor: '#FFF', '&:hover': { borderColor: '#e3dbff', bgcolor: 'rgba(255,255,255,0.1)' } })} startIcon={<PrintIcon />} onClick={() => window.print()}>
              {t('students.print')}
            </Button>
            <Button variant="outlined" style={sx({ color: '#FFF', borderColor: '#FFF', '&:hover': { borderColor: '#e3dbff', bgcolor: 'rgba(255,255,255,0.1)' } })} startIcon={<BackIcon />} onClick={() => navigate('/students')}>
              {t('common.back')}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper style={sx({ mb: 3 })} className="no-print">
        <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} variant="scrollable" scrollButtons="auto" textColor="primary" indicatorColor="primary">
          <Tab icon={<PersonIcon />} label={t('students.overview')} iconPosition="start" />
          <Tab icon={<AcademicIcon />} label={t('students.academic')} iconPosition="start" />
          <Tab icon={<AttendanceIcon />} label={t('students.attendance')} iconPosition="start" />
          <Tab icon={<GuardiansIcon />} label={t('students.guardians')} iconPosition="start" />
          <Tab icon={<DocsIcon />} label={t('students.documents')} iconPosition="start" />
          <Tab icon={<MedicalIcon />} label={t('students.medical')} iconPosition="start" />
          <Tab icon={<ScholarshipIcon />} label={t('students.scholarships')} iconPosition="start" />
          <Tab icon={<GradesIcon />} label={t('students.history')} iconPosition="start" />
          <Tab icon={<PreviousSchoolIcon />} label={t('students.previousSchools')} iconPosition="start" />
          <Tab icon={<HistoryIcon />} label={t('students.changeStatus')} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* 1. Overview */}
      {tabIndex === 0 && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card style={sx({ height: '100%' })}>
              <CardContent>
                <Typography variant="h6" style={sx({ color: '#6532c4', fontWeight: 600, mb: 2 })}>{t('students.personalInfo')}</Typography>
                <Divider style={sx({ mb: 2 })} />
                <Typography variant="body2" color="textSecondary">{t('students.email')}</Typography>
                <Typography variant="body1" style={sx({ fontWeight: 500, mb: 1.5 })}>{student.email || 'N/A'}</Typography>
                <Typography variant="body2" color="textSecondary">{t('students.phone')}</Typography>
                <Typography variant="body1" style={sx({ fontWeight: 500, mb: 1.5 })}>{student.phone || 'N/A'}</Typography>
                <Typography variant="body2" color="textSecondary">{t('students.dateOfBirth')}</Typography>
                <Typography variant="body1" style={sx({ fontWeight: 500, mb: 1.5 })}>{formatDate(student.date_of_birth)}</Typography>
                <Typography variant="body2" color="textSecondary">{t('students.identificationNumber')}</Typography>
                <Typography variant="body1" style={sx({ fontWeight: 500, mb: 1.5 })}>{student.identification_type || 'ID'}: {student.identification_number || 'N/A'}</Typography>
                <Typography variant="body2" color="textSecondary">{t('students.address')}</Typography>
                <Typography variant="body1" style={sx({ fontWeight: 500 })}>{student.address || 'N/A'}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card style={sx({ height: '100%' })}>
              <CardContent>
                <Typography variant="h6" style={sx({ color: '#6532c4', fontWeight: 600, mb: 2 })}>{t('students.academicInfo')}</Typography>
                <Divider style={sx({ mb: 2 })} />
                <Typography variant="body2" color="textSecondary">{t('students.enrollmentDate')}</Typography>
                <Typography variant="body1" style={sx({ fontWeight: 500, mb: 1.5 })}>{formatDate(student.enrollment_date)}</Typography>
                <Typography variant="body2" color="textSecondary">{t('students.graduationYear')}</Typography>
                <Typography variant="body1" style={sx({ fontWeight: 500, mb: 1.5 })}>{student.graduation_year || 'N/A'}</Typography>
                <Typography variant="body2" color="textSecondary">{t('students.cumulativeGpa')}</Typography>
                <Typography variant="h5" style={sx({ fontWeight: 700, color: '#6532c4', mb: 1.5 })}>
                  {gpa.cumulative_gpa !== null && gpa.cumulative_gpa !== undefined ? Number(gpa.cumulative_gpa).toFixed(2) : '—'} / 4.00
                </Typography>
                <Typography variant="body2" color="textSecondary">{t('students.creditsEarned')}</Typography>
                <Typography variant="h5" style={sx({ fontWeight: 700, color: '#047857' })}>{t('students.creditsValue', { value: credits.total_earned.toFixed(2) })}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card style={sx({ height: '100%' })}>
              <CardContent>
                <Typography variant="h6" style={sx({ color: '#6532c4', fontWeight: 600, mb: 2 })}>{t('common.actions')}</Typography>
                <Divider style={sx({ mb: 2 })} />
                <Box style={sx({ display: 'flex', flexDirection: 'column', gap: 1.5 })}>
                  <Button variant="outlined" fullWidth onClick={() => navigate(`/progress-reports/new?studentId=${student.id}`)}>
                    {t('students.generateProgressReport')}
                  </Button>
                  <Button variant="outlined" fullWidth onClick={() => navigate(`/report-cards/new?studentId=${student.id}`)}>
                    {t('students.generateReportCard')}
                  </Button>
                  <Button variant="outlined" fullWidth onClick={() => navigate(`/transcripts/new?studentId=${student.id}`)}>
                    {t('students.generateTranscript')}
                  </Button>
                  <Typography variant="body2" color="textSecondary" style={sx({ mt: 1 })}>{t('students.attendanceRate')}</Typography>
                  <Typography variant="h6" style={sx({ fontWeight: 700 })}>
                    {attendance.attendance_rate !== null ? `${attendance.attendance_rate}%` : '—'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          {student.notes && (
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" style={sx({ color: '#6532c4', fontWeight: 600, mb: 1 })}>{t('students.notes')}</Typography>
                  <Typography variant="body1">{student.notes}</Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* 2. Academic & Grades */}
      {tabIndex === 1 && (
        <Paper style={sx({ p: 3, borderTop: '4px solid', borderColor: 'primary.main' })}>
          <Typography variant="h6" style={sx({ color: '#6532c4', fontWeight: 600, mb: 2 })}>{t('students.grades')}</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead style={sx({ bgcolor: 'rgba(120,71,227,0.06)' })}>
                <TableRow>
                  <TableCell style={sx({ fontWeight: 'bold' })}>Subject</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold' })}>Period</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold', textAlign: 'center' })}>Grade</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold', textAlign: 'center' })}>Letter</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold' })}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {grades.length === 0 ? (
                  <TableRow><TableCell colSpan={5} style={sx({ textAlign: 'center', py: 3 })}>No grades recorded yet.</TableCell></TableRow>
                ) : (
                  grades.map((g) => (
                    <TableRow key={g.id} hover>
                      <TableCell>{g.subject_name || `Subject #${g.subject_id}`}</TableCell>
                      <TableCell>{g.period_name || `Period #${g.academic_period_id}`}</TableCell>
                      <TableCell style={sx({ textAlign: 'center', fontWeight: 'bold' })}>{g.grade_value}</TableCell>
                      <TableCell style={sx({ textAlign: 'center', fontWeight: 'bold', color: '#6532c4' })}>{g.grade_letter || '-'}</TableCell>
                      <TableCell><Chip size="small" label={g.status || 'DRAFT'} color={g.status === 'LOCKED' ? 'default' : 'primary'} /></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* 3. Attendance */}
      {tabIndex === 2 && (
        <Paper style={sx({ p: 3, borderTop: '4px solid', borderColor: 'primary.main' })}>
          <Typography variant="h6" style={sx({ color: '#6532c4', fontWeight: 600, mb: 2 })}>{t('students.attendance')}</Typography>
          <Grid container spacing={2} style={sx({ mb: 2 })}>
            {['P', 'O', 'E', 'U'].map((key) => (
              <Grid key={key} size={{ xs: 6, md: 3 }}>
                <Card variant="outlined">
                  <CardContent style={sx({ textAlign: 'center' })}>
                    <Typography variant="h5" style={sx({ fontWeight: 700, color: ATTENDANCE_CHIP[key].color })}>{attendance.totals[key] || 0}</Typography>
                    <Typography variant="caption" color="textSecondary">{ATTENDANCE_CHIP[key].label}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          <TableContainer>
            <Table size="small">
              <TableHead style={sx({ bgcolor: 'rgba(120,71,227,0.06)' })}>
                <TableRow>
                  <TableCell style={sx({ fontWeight: 'bold' })}>Date</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold' })}>Assignment</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold', textAlign: 'center' })}>Status</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold' })}>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendance.records.length === 0 ? (
                  <TableRow><TableCell colSpan={4} style={sx({ textAlign: 'center', py: 3 })}>No attendance records found.</TableCell></TableRow>
                ) : (
                  attendance.records.map((att) => (
                    <TableRow key={att.id} hover>
                      <TableCell>{formatDate(att.date)}</TableCell>
                      <TableCell>{att.assignment_name || `Assignment #${att.assignment_id}`}</TableCell>
                      <TableCell style={sx({ textAlign: 'center' })}>
                        <Chip size="small" label={ATTENDANCE_CHIP[att.status]?.label || att.status} style={sx({ fontWeight: 'bold', bgcolor: ATTENDANCE_CHIP[att.status]?.bg, color: ATTENDANCE_CHIP[att.status]?.color })} />
                      </TableCell>
                      <TableCell>{att.notes || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* 4. Guardians */}
      {tabIndex === 3 && (
        <Paper style={sx({ p: 3, borderTop: '4px solid', borderColor: 'primary.main' })}>
          <Box style={sx({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 })}>
            <Typography variant="h6" style={sx({ color: '#6532c4', fontWeight: 600 })}>{t('students.guardians')}</Typography>
            <Button size="small" variant="outlined" onClick={() => navigate(`/guardians/new?studentId=${student.id}`)}>+ {t('common.add')}</Button>
          </Box>
          <Grid container spacing={2}>
            {guardians.length === 0 ? (
              <Grid size={{ xs: 12 }}><Typography color="textSecondary">No guardians associated with this student.</Typography></Grid>
            ) : (
              guardians.map((g) => (
                <Grid key={g.id} size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box style={sx({ display: 'flex', justifyContent: 'space-between', mb: 1 })}>
                        <Typography variant="h6" style={sx({ fontWeight: 600 })}>{g.full_name || `${g.first_name || ''} ${g.last_name || ''}`}</Typography>
                        <Box style={sx({ display: 'flex', gap: 0.5 })}>
                          {g.is_primary === 1 || g.is_primary === true ? <Chip size="small" label="Primary" color="primary" /> : null}
                          <Chip size="small" label={g.relationship || 'Guardian'} />
                        </Box>
                      </Box>
                      <Typography variant="body2">Phone: <strong>{g.phone || 'N/A'}</strong></Typography>
                      <Typography variant="body2">Email: <strong>{g.email || 'N/A'}</strong></Typography>
                      <Typography variant="body2">Address: <strong>{g.address || 'N/A'}</strong></Typography>
                      <Typography variant="body2">Emergency Contact: <strong>{g.is_emergency_contact ? 'Yes' : 'No'}</strong></Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        </Paper>
      )}

      {/* 5. Documents */}
      {tabIndex === 4 && (
        <Paper style={sx({ p: 3, borderTop: '4px solid', borderColor: 'primary.main' })}>
          <Box style={sx({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 })}>
            <Typography variant="h6" style={sx({ color: '#6532c4', fontWeight: 600 })}>{t('students.documents')}</Typography>
            <Button size="small" variant="outlined" onClick={() => navigate(`/documents/new?studentId=${student.id}`)}>+ {t('common.add')}</Button>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead style={sx({ bgcolor: 'rgba(120,71,227,0.06)' })}>
                <TableRow>
                  <TableCell style={sx({ fontWeight: 'bold' })}>Code</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold' })}>Title</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold' })}>Type</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold' })}>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documents.length === 0 ? (
                  <TableRow><TableCell colSpan={4} style={sx({ textAlign: 'center', py: 3 })}>No documents uploaded.</TableCell></TableRow>
                ) : (
                  documents.map((d) => (
                    <TableRow key={d.id} hover style={sx({ cursor: 'pointer' })} onClick={() => navigate(`/documents/${d.id}`)}>
                      <TableCell>{d.code}</TableCell>
                      <TableCell>{d.title || d.file_name}</TableCell>
                      <TableCell>{d.document_type}</TableCell>
                      <TableCell>{formatDate(d.upload_date || d.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* 6. Medical Record */}
      {tabIndex === 5 && (
        <Paper style={sx({ p: 3, borderTop: '4px solid', borderColor: 'primary.main' })}>
          <Box style={sx({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 })}>
            <Typography variant="h6" style={sx({ color: '#6532c4', fontWeight: 600 })}>{t('students.medical')}</Typography>
            <Button size="small" variant="outlined" onClick={() => navigate(medical ? `/medical-records/${medical.id}/edit` : `/medical-records/new?studentId=${student.id}`)}>
              {medical ? t('common.edit') : `+ ${t('common.add')}`}
            </Button>
          </Box>
          {medical ? (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="textSecondary">Medical Conditions</Typography>
                <Typography variant="body1" style={sx({ fontWeight: 500, mb: 2 })}>{medical.medical_condition || 'None reported'}</Typography>
                <Typography variant="body2" color="textSecondary">Allergies</Typography>
                <Typography variant="body1" style={sx({ fontWeight: 500, mb: 2 })}>{medical.allergies || 'None reported'}</Typography>
                <Typography variant="body2" color="textSecondary">Medications</Typography>
                <Typography variant="body1" style={sx({ fontWeight: 500, mb: 2 })}>{medical.medications || 'None'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="body2" color="textSecondary">Health Insurance</Typography>
                <Typography variant="body1" style={sx({ fontWeight: 500, mb: 2 })}>{medical.health_insurance || 'N/A'} (#{medical.insurance_number || 'N/A'})</Typography>
                <Typography variant="body2" color="textSecondary">Emergency Contact</Typography>
                <Typography variant="body1" style={sx({ fontWeight: 500, mb: 2 })}>{medical.emergency_contact_name || 'N/A'} ({medical.emergency_contact_phone || 'N/A'})</Typography>
              </Grid>
            </Grid>
          ) : (
            <Typography color="textSecondary">No medical record registered for this student.</Typography>
          )}
        </Paper>
      )}

      {/* 7. Scholarships */}
      {tabIndex === 6 && (
        <Paper style={sx({ p: 3, borderTop: '4px solid', borderColor: 'primary.main' })}>
          <Typography variant="h6" style={sx({ color: '#6532c4', fontWeight: 600, mb: 2 })}>{t('students.scholarships')}</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead style={sx({ bgcolor: 'rgba(120,71,227,0.06)' })}>
                <TableRow>
                  <TableCell style={sx({ fontWeight: 'bold' })}>Code</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold' })}>Type</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold' })}>Percentage</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold' })}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {scholarships.length === 0 ? (
                  <TableRow><TableCell colSpan={4} style={sx({ textAlign: 'center', py: 3 })}>No scholarships recorded.</TableCell></TableRow>
                ) : (
                  scholarships.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell>{s.code}</TableCell>
                      <TableCell>{s.scholarship_type}</TableCell>
                      <TableCell>{s.percentage ? `${s.percentage}%` : `$${s.amount}`}</TableCell>
                      <TableCell><Chip size="small" label={s.status} color="primary" /></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* 8. Academic History */}
      {tabIndex === 7 && (
        <Paper style={sx({ p: 3, borderTop: '4px solid', borderColor: 'primary.main' })}>
          <Typography variant="h6" style={sx({ color: '#6532c4', fontWeight: 600, mb: 2 })}>{t('students.history')}</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead style={sx({ bgcolor: 'rgba(120,71,227,0.06)' })}>
                <TableRow>
                  <TableCell style={sx({ fontWeight: 'bold' })}>Year</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold' })}>Subject</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold', textAlign: 'center' })}>Grade</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold', textAlign: 'center' })}>Credits</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow><TableCell colSpan={4} style={sx({ textAlign: 'center', py: 3 })}>No historical records available.</TableCell></TableRow>
                ) : (
                  history.map((h) => (
                    <TableRow key={h.id} hover>
                      <TableCell>{h.academic_year_name || '-'}</TableCell>
                      <TableCell>{h.subject_name || `Subject #${h.subject_id}`}</TableCell>
                      <TableCell style={sx({ textAlign: 'center', fontWeight: 'bold' })}>{h.final_grade}</TableCell>
                      <TableCell style={sx({ textAlign: 'center' })}>{h.credits || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* 9. Previous Schools */}
      {tabIndex === 8 && (
        <Paper style={sx({ p: 3, borderTop: '4px solid', borderColor: 'primary.main' })}>
          <Box style={sx({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 })}>
            <Typography variant="h6" style={sx({ color: '#6532c4', fontWeight: 600 })}>{t('students.previousSchools')}</Typography>
            <Button size="small" variant="outlined" onClick={() => navigate(`/previous-schools/new?studentId=${student.id}`)}>+ {t('common.add')}</Button>
          </Box>
          {previousSchools.length === 0 ? (
            <Typography color="textSecondary">{t('students.noPreviousSchools')}</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead style={sx({ bgcolor: 'rgba(120,71,227,0.06)' })}>
                  <TableRow>
                    <TableCell style={sx({ fontWeight: 'bold' })}>{t('students.schoolName')}</TableCell>
                    <TableCell style={sx({ fontWeight: 'bold' })}>{t('students.location')}</TableCell>
                    <TableCell style={sx({ fontWeight: 'bold' })}>{t('students.yearsAttended')}</TableCell>
                    <TableCell style={sx({ fontWeight: 'bold', textAlign: 'center' })}>{t('students.creditsTransferred')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previousSchools.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell>{s.school_name}</TableCell>
                      <TableCell>{s.location || '-'}</TableCell>
                      <TableCell>{s.years_attended || '-'}</TableCell>
                      <TableCell style={sx({ textAlign: 'center' })}>{s.credits_transferred ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* 10. Status History */}
      {tabIndex === 9 && (
        <Paper style={sx({ p: 3, borderTop: '4px solid', borderColor: 'primary.main' })}>
          <Typography variant="h6" style={sx({ color: '#6532c4', fontWeight: 600, mb: 2 })}>{t('students.changeStatus')} — {t('students.history')}</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead style={sx({ bgcolor: 'rgba(120,71,227,0.06)' })}>
                <TableRow>
                  <TableCell style={sx({ fontWeight: 'bold' })}>Date</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold' })}>From</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold' })}>To</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold' })}>{t('students.reason')}</TableCell>
                  <TableCell style={sx({ fontWeight: 'bold' })}>User</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {statusHistory.length === 0 ? (
                  <TableRow><TableCell colSpan={5} style={sx({ textAlign: 'center', py: 3 })}>No status changes recorded.</TableCell></TableRow>
                ) : (
                  statusHistory.map((s) => (
                    <TableRow key={s.id} hover>
                      <TableCell>{formatDate(s.created_at)}</TableCell>
                      <TableCell>{s.from_status ? <Chip size="small" label={s.from_status} /> : '-'}</TableCell>
                      <TableCell><Chip size="small" color={STATUS_COLOR[s.to_status] || 'default'} label={s.to_status} /></TableCell>
                      <TableCell>{s.reason || '-'}</TableCell>
                      <TableCell>{s.changed_by_name || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Change Status Dialog */}
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
    </Box>
  );
};

export default StudentRecordPage;
