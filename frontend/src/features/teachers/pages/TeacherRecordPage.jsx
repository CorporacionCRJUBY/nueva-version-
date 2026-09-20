// FILE: frontend/src/features/teachers/pages/TeacherRecordPage.jsx
import { sx } from '../../../ui/sx';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
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
} from '@mui/material';
import { ArrowLeft as BackIcon, Pencil as EditIcon, User as PersonIcon, ClipboardList as AssignmentsIcon, Mail as EmailIcon, Phone as PhoneIcon } from 'lucide-react';
import teachersApi from '../api';
import branchesApi from '../../branches/api';
import { formatDate } from '../../../utils/formatters';

const STATUS_COLOR = {
  ACTIVE: 'success',
  INACTIVE: 'default',
};

const TeacherRecordPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState(null);
  const [branch, setBranch] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teacherRes, assignmentsRes] = await Promise.all([
        teachersApi.getById(id),
        teachersApi.getAssignments(id),
      ]);
      // `api.get` unwraps axios' response.data, así que cada `Res` aquí es
      // el envelope `{ success, data }` del backend.
      const teacherData = teacherRes?.data || teacherRes;
      setTeacher(teacherData);
      setAssignments(assignmentsRes?.data || []);

      if (teacherData?.branch_id) {
        try {
          const branchRes = await branchesApi.getById(teacherData.branch_id);
          setBranch(branchRes?.data || branchRes);
        } catch {
          // La sede es solo informativa; si no se puede cargar, la
          // ficha del profesor se sigue mostrando igual.
          setBranch(null);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box style={sx({ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' })}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!teacher) {
    return <Alert severity="warning">{t('teachers.notFound', { defaultValue: 'Profesor no encontrado' })}</Alert>;
  }

  return (
    <Box>
      <Box style={sx({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 })}>
        <Box style={sx({ display: 'flex', alignItems: 'center', gap: 1 })}>
          <Button startIcon={<BackIcon />} onClick={() => navigate('/teachers')}>
            {t('common.back', { defaultValue: 'Volver' })}
          </Button>
        </Box>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/teachers/${id}/edit`)}
        >
          {t('common.edit')}
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent style={sx({ textAlign: 'center' })}>
              <Avatar style={sx({ width: 72, height: 72, mx: 'auto', mb: 2, bgcolor: 'primary.main' })}>
                <PersonIcon style={sx({ fontSize: 40 })} />
              </Avatar>
              <Typography variant="h6" style={sx({ fontWeight: 600 })}>
                {teacher.first_name} {teacher.last_name}
              </Typography>
              <Typography variant="body2" color="text.secondary" style={sx({ mb: 1 })}>
                {teacher.code}
              </Typography>
              <Chip
                size="small"
                label={teacher.status}
                color={STATUS_COLOR[teacher.status] || 'default'}
              />
              <Divider style={sx({ my: 2 })} />
              <Box style={sx({ textAlign: 'left' })}>
                <Box style={sx({ display: 'flex', alignItems: 'center', gap: 1, mb: 1 })}>
                  <EmailIcon fontSize="small" color="action" />
                  <Typography variant="body2">{teacher.email}</Typography>
                </Box>
                {teacher.phone && (
                  <Box style={sx({ display: 'flex', alignItems: 'center', gap: 1, mb: 1 })}>
                    <PhoneIcon fontSize="small" color="action" />
                    <Typography variant="body2">{teacher.phone}</Typography>
                  </Box>
                )}
                {teacher.specialization && (
                  <Typography variant="body2" style={sx({ mt: 1 })}>
                    <strong>{t('teachers.specialization', { defaultValue: 'Especialización' })}:</strong>{' '}
                    {teacher.specialization}
                  </Typography>
                )}
                {teacher.hire_date && (
                  <Typography variant="body2" style={sx({ mt: 1 })}>
                    <strong>{t('teachers.hireDate', { defaultValue: 'Fecha de contratación' })}:</strong>{' '}
                    {formatDate(teacher.hire_date)}
                  </Typography>
                )}
                {branch?.name && (
                  <Typography variant="body2" style={sx({ mt: 1 })}>
                    <strong>{t('teachers.branch', { defaultValue: 'Sede' })}:</strong> {branch.name}
                  </Typography>
                )}
                {teacher.notes && (
                  <Typography variant="body2" style={sx({ mt: 1 })}>
                    <strong>{t('common.notes', { defaultValue: 'Notas' })}:</strong> {teacher.notes}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Paper style={sx({ p: 3 })}>
            <Box style={sx({ display: 'flex', alignItems: 'center', gap: 1, mb: 2 })}>
              <AssignmentsIcon color="primary" />
              <Typography variant="h6">
                {t('teachers.assignments', { defaultValue: 'Asignaciones académicas' })}
              </Typography>
            </Box>

            {assignments.length === 0 ? (
              <Alert severity="info">
                {t('teachers.noAssignments', { defaultValue: 'Este profesor no tiene asignaciones registradas.' })}
              </Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{t('teachers.subject', { defaultValue: 'Materia' })}</TableCell>
                      <TableCell>{t('teachers.grade', { defaultValue: 'Grado' })}</TableCell>
                      <TableCell>{t('teachers.section', { defaultValue: 'Sección' })}</TableCell>
                      <TableCell>{t('teachers.academicYear', { defaultValue: 'Año académico' })}</TableCell>
                      <TableCell>{t('teachers.schedule', { defaultValue: 'Horario' })}</TableCell>
                      <TableCell>{t('teachers.status', { defaultValue: 'Estado' })}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.subject_name}</TableCell>
                        <TableCell>{a.grade}</TableCell>
                        <TableCell>{a.section || '-'}</TableCell>
                        <TableCell>{a.academic_year_name}</TableCell>
                        <TableCell>{a.schedule || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={a.status}
                            color={STATUS_COLOR[a.status] || 'default'}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TeacherRecordPage;
