// FILE: frontend/src/features/assignments/pages/MyGroupsPage.jsx
//
// FIX (bitácora 2026-09-16, "autoasignación de materias por el docente"):
// antes de esto, SOLO un ADMIN podía crear una fila en `academic_assignments`
// (AssignmentFormPage), eligiendo a mano el docente, la materia, el grupo y
// el horario. En el colegio real que va a usar el sistema, los profesores
// que ya están dando clase no saben qué materia les toca ni en qué horario
// hasta que alguien se lo dice a mano.
//
// Esta pantalla invierte el flujo para el rol TEACHER: el docente entra,
// busca el grupo (grado+sección, con la cantidad de estudiantes) donde va a
// dar clase, ve qué materias tiene ese grupo y quién las está dando, y se
// autoasigna la que le toca junto con su horario. Puede volver después a
// corregir el horario o quitarse una materia si se equivocó — "para que
// vayan a ver por si les falta modificar algo", como pidió el colegio.
//
// El backend (`GET /assignments/groups`) ya resuelve todo el cálculo de
// quién es "propio" (is_mine) y a quién pertenece cada asignación; esta
// pantalla solo pinta esa respuesta y llama create/update/delete de
// `assignmentsApi`, que en el servidor quedan restringidos a la propia
// asignación del docente (ver assignments.service.js).
import { sx } from '../../../ui/sx';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
} from '@mui/material';
import { Users as UsersIcon, Pencil as EditIcon, X as RemoveIcon, Plus as AddIcon } from 'lucide-react';
import useConfirm from '../../../hooks/useConfirm';
import { PageHeader, ErrorBanner, FormLoading } from '../../../components/FormKit';
import assignmentsApi from '../api';
import academicYearsApi from '../../academicYears/api';

const MyGroupsPage = () => {
  const { t } = useTranslation();
  const [confirm, ConfirmDialog] = useConfirm();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeYear, setActiveYear] = useState(null);
  const [groups, setGroups] = useState([]);

  const [dialog, setDialog] = useState(null); // { mode: 'create'|'edit', group, subject, assignment }
  const [scheduleInput, setScheduleInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadActiveYear = useCallback(async () => {
    const res = await academicYearsApi.getAll({ pageSize: 1000 });
    const years = res?.data?.data || res?.data || [];
    return years.find((y) => y.is_active) || null;
  }, []);

  const loadGroups = useCallback(async (year) => {
    if (!year) {
      setGroups([]);
      return;
    }
    const res = await assignmentsApi.getGroups({ academicYearId: year.id });
    setGroups(res?.data || []);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const year = await loadActiveYear();
      setActiveYear(year);
      await loadGroups(year);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loadActiveYear, loadGroups]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAssignDialog = (group, subject) => {
    setScheduleInput('');
    setDialog({ mode: 'create', group, subject });
  };

  const openEditDialog = (group, subject) => {
    setScheduleInput(subject.assignment?.schedule || '');
    setDialog({ mode: 'edit', group, subject, assignment: subject.assignment });
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialog(null);
    setScheduleInput('');
  };

  const handleSubmitDialog = async (e) => {
    e.preventDefault();
    if (!dialog) return;
    setSubmitting(true);
    setError(null);
    try {
      if (dialog.mode === 'create') {
        await assignmentsApi.create({
          subject_id: dialog.subject.subject_id,
          grade: dialog.group.grade,
          section: dialog.group.section,
          branch_id: dialog.group.branch_id,
          academic_year_id: dialog.group.academic_year_id,
          schedule: scheduleInput || null,
        });
        setSuccess(t('assignments.myGroups.createSuccess'));
      } else {
        await assignmentsApi.update(dialog.assignment.id, { schedule: scheduleInput || null });
        setSuccess(t('assignments.myGroups.updateSuccess'));
      }
      setDialog(null);
      await loadGroups(activeYear);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (assignment) => {
    const ok = await confirm(t('assignments.myGroups.confirmRemove'), {
      confirmText: t('common.delete', { defaultValue: 'Eliminar' }),
      confirmColor: 'error',
    });
    if (!ok) return;
    setError(null);
    try {
      await assignmentsApi.delete(assignment.id);
      setSuccess(t('assignments.myGroups.removeSuccess'));
      await loadGroups(activeYear);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <FormLoading sections={3} fieldsPerSection={4} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('assignments.myGroups.title')} />

      <Typography variant="body2" color="text.secondary">
        {t('assignments.myGroups.subtitle')}
      </Typography>

      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}
      {success && <ErrorBanner message={success} tone="success" onClose={() => setSuccess(null)} />}

      {!activeYear ? (
        <ErrorBanner tone="warning" message={t('assignments.myGroups.noActiveYear')} />
      ) : (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {t('assignments.myGroups.activeYear')}: <strong>{activeYear.name}</strong>
        </Typography>
      )}

      {activeYear && groups.length === 0 && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">{t('assignments.myGroups.noGroups')}</Typography>
        </Paper>
      )}

      <Grid container spacing={2}>
        {groups.map((group) => (
          <Grid item xs={12} md={6} key={`${group.grade}-${group.section}-${group.branch_id}`}>
            <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="h6">
                  {t('assignments.myGroups.group')} {group.grade}
                  {group.section ? ` - ${group.section}` : ''}
                </Typography>
                <Chip
                  size="small"
                  icon={<UsersIcon size={14} />}
                  label={`${group.student_count} ${t('assignments.myGroups.students')}`}
                  variant="outlined"
                />
              </Box>
              <Divider sx={{ mb: 1.5 }} />

              {group.subjects.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {t('assignments.myGroups.noGroups')}
                </Typography>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {group.subjects.map((subject) => {
                  const a = subject.assignment;
                  return (
                    <Box
                      key={subject.subject_id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 1.5,
                        py: 1,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {subject.subject_name}
                        </Typography>
                        {a ? (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {a.is_mine
                              ? t('assignments.myGroups.assignedToMe')
                              : t('assignments.myGroups.assignedToOther', { teacher: a.teacher_name })}
                            {a.schedule ? ` · ${a.schedule}` : ''}
                          </Typography>
                        ) : (
                          <Chip size="small" color="success" variant="outlined" label={t('assignments.myGroups.available')} />
                        )}
                      </Box>

                      {!a && (
                        <Button size="small" startIcon={<AddIcon size={14} />} onClick={() => openAssignDialog(group, subject)}>
                          {t('assignments.myGroups.assignSubject')}
                        </Button>
                      )}
                      {a && a.is_mine && (
                        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                          <Button size="small" startIcon={<EditIcon size={14} />} onClick={() => openEditDialog(group, subject)}>
                            {t('assignments.myGroups.editSchedule')}
                          </Button>
                          <Button size="small" color="error" startIcon={<RemoveIcon size={14} />} onClick={() => handleRemove(a)}>
                            {t('assignments.myGroups.removeAssignment')}
                          </Button>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Dialog open={!!dialog} onClose={closeDialog} fullWidth maxWidth="xs">
        <form onSubmit={handleSubmitDialog}>
          <DialogTitle>
            {dialog?.mode === 'create'
              ? t('assignments.myGroups.dialogTitle', { subject: dialog?.subject?.subject_name })
              : t('assignments.myGroups.dialogTitleEdit', { subject: dialog?.subject?.subject_name })}
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              required
              margin="dense"
              label={t('assignments.schedule')}
              placeholder={t('assignments.myGroups.scheduleHelp')}
              helperText={t('assignments.myGroups.scheduleRequired')}
              value={scheduleInput}
              onChange={(e) => setScheduleInput(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} disabled={submitting}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? <CircularProgress size={20} /> : t('common.save')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {ConfirmDialog}
    </div>
  );
};

export default MyGroupsPage;
