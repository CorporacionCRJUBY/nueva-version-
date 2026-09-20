// FILE: frontend/src/features/attendance/pages/MonthlyAttendancePage.jsx
import { sx } from '../../../ui/sx';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import { ArrowLeft as BackIcon, FileText as PdfIcon, RefreshCw as RefreshIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../api/axiosClient';

// FIX (auditoria hallazgo bajo B10): los labels de cada estado ahora se
// toman de i18n (attendance.present/online/excused/unexcused) en la
// leyenda, así que ya no se guardan aquí textos en inglés.
const STATUS_COLORS = {
  P: { bg: 'rgba(4,120,87,0.12)', text: '#047857' },
  O: { bg: 'rgba(124,58,237,0.12)', text: '#6d28d9' },
  E: { bg: 'rgba(180,83,9,0.12)', text: '#b45309' },
  U: { bg: 'rgba(185,28,28,0.12)', text: '#b91c1c' },
};

const MonthlyAttendancePage = () => {
  const { t, i18n } = useTranslation();
  const { assignmentId: routeAssignmentId } = useParams();
  const navigate = useNavigate();

  // FIX (auditoría): los años del selector ya no están fijos en [2025..2028].
  // Se derivan del año actual para que la vista siga siendo válida en el futuro.
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const [assignmentId, setAssignmentId] = useState(routeAssignmentId || '');
  const [assignments, setAssignments] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [gridData, setGridData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Cargar asignaciones para el selector
  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const res = await api.get('/assignments?pageSize=100');
        const list = res.data?.data || res.data || [];
        setAssignments(list);
        if (!assignmentId && list.length > 0) {
          setAssignmentId(list[0].id);
        }
      } catch (err) {
        console.error('Error loading assignments:', err);
      }
    };
    loadAssignments();
  }, []);

  // Cargar matriz de asistencia
  const loadGrid = async () => {
    if (!assignmentId) return;
    setLoading(true);
    try {
      const res = await api.get(`/attendance/monthly/${assignmentId}/${year}/${month}`);
      setGridData(res.data?.data || res.data);
    } catch (err) {
      console.error('Error loading attendance matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (assignmentId) {
      loadGrid();
    }
  }, [assignmentId, year, month]);

  const handleStatusClick = async (studentId, dayNumber, currentStatus) => {
    const nextStatus = currentStatus === 'P' ? 'O' : currentStatus === 'O' ? 'E' : currentStatus === 'E' ? 'U' : currentStatus === 'U' ? null : 'P';
    const paddedMonth = String(month).padStart(2, '0');
    const paddedDay = String(dayNumber).padStart(2, '0');
    const dateStr = `${year}-${paddedMonth}-${paddedDay}`;

    try {
      await api.post('/attendance/daily', {
        assignmentId,
        date: dateStr,
        records: [{ student_id: studentId, status: nextStatus || 'P' }]
      });
      loadGrid();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  return (
    <Box style={sx({ p: 3 })}>
      {/* Header */}
      <Box style={sx({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 })}>
        <Box style={sx({ display: 'flex', alignItems: 'center', gap: 2 })}>
          <Button variant="outlined" startIcon={<BackIcon />} onClick={() => navigate('/attendance')}>
            {t('common.back')}
          </Button>
          <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>
            {t('attendance.monthlyTitle')}
          </Typography>
        </Box>
        <Box style={sx({ display: 'flex', gap: 1 })}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadGrid}>
            {t('common.refresh')}
          </Button>
        </Box>
      </Box>

      {/* Selectors */}
      <Paper style={sx({ p: 2, mb: 3 })}>
        <Grid container spacing={2} style={sx({ alignItems: 'center' })}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('attendance.academicAssignment')}</InputLabel>
              <Select
                value={assignmentId}
                label={t('attendance.academicAssignment')}
                onChange={(e) => setAssignmentId(e.target.value)}
              >
                {assignments.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.code} — {a.subject_name || `Subject #${a.subject_id}`} (Grade {a.grade} {a.section || ''})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('attendance.month')}</InputLabel>
              <Select value={month} label={t('attendance.month')} onChange={(e) => setMonth(e.target.value)}>
                {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                  <MenuItem key={m} value={m}>
                    {new Date(2026, m - 1).toLocaleString(i18n.language || 'en-US', { month: 'long' })}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('attendance.year')}</InputLabel>
              <Select value={year} label={t('attendance.year')} onChange={(e) => setYear(e.target.value)}>
                {yearOptions.map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Info Card */}
      {gridData?.assignment && (
        <Paper style={sx({ p: 2, mb: 3, bgcolor: 'rgba(124,58,237,0.06)', borderLeft: '4px solid #7c3aed' })}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="body2" color="textSecondary">{t('attendance.teacher')}</Typography>
              <Typography variant="subtitle2" style={sx({ fontWeight: 600 })}>{gridData.assignment.teacher_name || 'N/A'}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="body2" color="textSecondary">{t('attendance.subject')}</Typography>
              <Typography variant="subtitle2" style={sx({ fontWeight: 600 })}>{gridData.assignment.subject_name || 'N/A'}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="body2" color="textSecondary">{t('attendance.grade')} & {t('students.section')}</Typography>
              <Typography variant="subtitle2" style={sx({ fontWeight: 600 })}>{t('attendance.grade')} {gridData.assignment.grade} {gridData.assignment.section || ''}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="body2" color="textSecondary">{t('students.branch')}</Typography>
              <Typography variant="subtitle2" style={sx({ fontWeight: 600 })}>{gridData.assignment.branch_name || 'N/A'}</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Matrix Table */}
      {loading ? (
        <Box style={sx({ display: 'flex', justifyContent: 'center', p: 5 })}>
          <CircularProgress />
        </Box>
      ) : gridData?.students ? (
        <Paper style={sx({ overflow: 'hidden' })}>
          <TableContainer style={sx({ maxHeight: '65vh' })} className="scrollbar-thin">
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell className="sticky-col" style={sx({ minWidth: 160, fontWeight: 'bold', bgcolor: '#7c3aed', color: '#FFF' })}>{t('attendance.student')}</TableCell>
                  <TableCell style={sx({ width: 60, fontWeight: 'bold', bgcolor: '#7c3aed', color: '#FFF', textAlign: 'center' })}>{t('attendance.grade')}</TableCell>
                  {gridData.days?.map((d) => (
                    <TableCell
                      key={d.dayNumber}
                      style={sx({
                        width: 32,
                        p: 0.5,
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        bgcolor: d.isWeekend ? '#4c1d95' : '#7c3aed',
                        // El fin de semana se distinguía con un blanco al 6% de
                        // opacidad; como el fondo de la cabecera es la propia
                        // celda, el blanco al 6% dejaba ver el lienzo claro y
                        // el texto blanco quedaba INVISIBLE. Se usa ahora un
                        // morado más profundo: mantiene la distinción del fin
                        // de semana y conserva contraste AA con el texto blanco
                        // (11.4:1).
                        color: '#FFF',
                      })}
                    >
                      <div>{d.dayNumber}</div>
                      <div style={{ fontSize: '0.65rem', opacity: 0.85 }}>{d.weekday}</div>
                    </TableCell>
                  ))}
                  <TableCell style={sx({ width: 36, textAlign: 'center', fontWeight: 'bold', bgcolor: '#6d28d9', color: '#FFF' })}>O</TableCell>
                  <TableCell style={sx({ width: 36, textAlign: 'center', fontWeight: 'bold', bgcolor: '#B91C1C', color: '#FFF' })}>U</TableCell>
                  <TableCell style={sx({ width: 36, textAlign: 'center', fontWeight: 'bold', bgcolor: '#B45309', color: '#FFF' })}>E</TableCell>
                  <TableCell style={sx({ width: 36, textAlign: 'center', fontWeight: 'bold', bgcolor: '#047857', color: '#FFF' })}>P</TableCell>
                  <TableCell style={sx({ width: 60, textAlign: 'center', fontWeight: 'bold', bgcolor: '#7c3aed', color: '#FFF' })}>{t('attendance.rate')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gridData.students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={38} style={sx({ textAlign: 'center', py: 4 })}>
                      No active students found for this assignment's grade and section.
                    </TableCell>
                  </TableRow>
                ) : (
                  gridData.students.map((st) => (
                    <TableRow key={st.id} hover>
                      <TableCell className="sticky-col" style={sx({ fontWeight: 600 })}>{st.fullName}</TableCell>
                      <TableCell style={sx({ textAlign: 'center' })}>{st.grade}</TableCell>
                      {gridData.days?.map((d) => {
                        const val = st.records ? st.records[d.dayNumber] : null;
                        const colorInfo = val ? STATUS_COLORS[val] : null;
                        return (
                          <TableCell
                            key={d.dayNumber}
                            onClick={() => !d.isWeekend && handleStatusClick(st.id, d.dayNumber, val)}
                            style={sx({
                              p: 0.25,
                              textAlign: 'center',
                              cursor: d.isWeekend ? 'default' : 'pointer',
                              bgcolor: d.isWeekend ? 'rgba(255,255,255,0.03)' : (colorInfo ? colorInfo.bg : 'inherit'),
                              color: colorInfo ? colorInfo.text : '#7c6faa',
                              fontWeight: 'bold',
                              fontSize: '0.75rem',
                              '&:hover': {
                                bgcolor: d.isWeekend ? 'rgba(255,255,255,0.03)' : 'rgba(124,58,237,0.10)',
                              }
                            })}
                          >
                            {val || (d.isWeekend ? '·' : '-')}
                          </TableCell>
                        );
                      })}
                      <TableCell style={sx({ textAlign: 'center', fontWeight: 600 })}>{st.totals?.online || 0}</TableCell>
                      <TableCell style={sx({ textAlign: 'center', fontWeight: 600, color: '#B91C1C' })}>{st.totals?.unexcused || 0}</TableCell>
                      <TableCell style={sx({ textAlign: 'center', fontWeight: 600, color: '#B45309' })}>{st.totals?.excused || 0}</TableCell>
                      <TableCell style={sx({ textAlign: 'center', fontWeight: 600, color: '#047857' })}>{st.totals?.present || 0}</TableCell>
                      <TableCell style={sx({ textAlign: 'center', fontWeight: 700, color: '#6d28d9' })}>
                        {st.totals?.attendanceRate || 100}%
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Legend */}
          <Box style={sx({ p: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', bgcolor: '#f5f3ff', borderTop: '1px solid #ddd6fe' })}>
            <Typography variant="body2" style={sx({ fontWeight: 'bold' })}>{t('attendance.legendTitle')}</Typography>
            <Chip size="small" label={`P = ${t('attendance.present')}`} style={sx({ bgcolor: 'rgba(4,120,87,0.12)', color: '#047857', fontWeight: 'bold' })} />
            <Chip size="small" label={`O = ${t('attendance.online')}`} style={sx({ bgcolor: 'rgba(124,58,237,0.12)', color: '#6d28d9', fontWeight: 'bold' })} />
            <Chip size="small" label={`E = ${t('attendance.excused')}`} style={sx({ bgcolor: 'rgba(180,83,9,0.12)', color: '#b45309', fontWeight: 'bold' })} />
            <Chip size="small" label={`U = ${t('attendance.unexcused')}`} style={sx({ bgcolor: 'rgba(185,28,28,0.12)', color: '#b91c1c', fontWeight: 'bold' })} />
          </Box>
        </Paper>
      ) : null}
    </Box>
  );
};

export default MonthlyAttendancePage;
