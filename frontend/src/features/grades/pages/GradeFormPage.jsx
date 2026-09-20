// FILE: frontend/src/features/grades/pages/GradeFormPage.jsx
import { sx } from '../../../ui/sx';
import { FormSection, FormGrid, FormCol, FormActions, PageHeader, ErrorBanner, FormLoading } from '../../../components/FormKit';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useConfirm from '../../../hooks/useConfirm';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  MenuItem,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Divider,
} from '@mui/material';
import { Save as SaveIcon, XCircle as CancelIcon, Lock as LockIcon, Trash2 as DeleteIcon } from 'lucide-react';
import AsyncSelect from '../../../components/AsyncSelect';
import gradesApi from '../api';
import studentsApi from '../../students/api';
import subjectsApi from '../../subjects/api';
import assignmentsApi from '../../assignments/api';
import academicPeriodsApi from '../../academicPeriods/api';

const emptyForm = {
  student_id: '',
  subject_id: '',
  assignment_id: '',
  academic_period_id: '',
  grade_value: '',
  grade_letter: '',
  weight: 1.0,
  status: 'DRAFT',
};

const GradeFormPage = () => {
  const { t } = useTranslation();
  const [confirm, ConfirmDialog] = useConfirm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [formData, setFormData] = useState(emptyForm);

  // FIX (bitácora 2026-09-15, pendiente "pageSize=1000 en los selectores"):
  // los cuatro campos de abajo pedían el catálogo COMPLETO de estudiantes,
  // materias, asignaciones y periodos (hasta 1000 filas cada uno) solo para
  // llenar un <Select>. Con AsyncSelect cada campo busca contra el servidor
  // según lo que la persona escribe — nunca trae más de 20 filas a la vez, y
  // escala igual de bien con 50 estudiantes que con 5000.
  useEffect(() => {
    if (isEdit) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await gradesApi.getById(id);
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data }` envelope from the backend — read `.data`, not the envelope.
      const record = response?.data || response;
      setFormData({ ...emptyForm, ...record });
      setIsLocked(record.status === 'LOCKED');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Los cuatro AsyncSelect no traen un evento nativo — entregan el id
  // seleccionado directamente — así que usan este atajo en vez de handleChange.
  const handleSelectChange = (name) => (selectedId) => {
    setFormData((prev) => ({ ...prev, [name]: selectedId }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // FIX (bitácora 2026-09-15): el formulario mandaba el registro entero tal
      // como lo tenía en estado — con los ids y el peso como texto (o null si
      // el campo se vaciaba), lo que producía un 400 "Weight must be between 0
      // and 1" que el usuario nunca llegaba a leer. Aquí se manda solo lo que
      // el endpoint espera, con los números ya convertidos y el peso por
      // defecto en 1 cuando se deja vacío.
      const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
      const payload = {
        student_id: num(formData.student_id),
        subject_id: num(formData.subject_id),
        assignment_id: num(formData.assignment_id),
        academic_period_id: num(formData.academic_period_id),
        grade_value: num(formData.grade_value),
        grade_letter: formData.grade_letter?.trim() ? formData.grade_letter.trim() : null,
        weight: num(formData.weight) ?? 1,
        status: formData.status || 'DRAFT',
      };

      if (isEdit) {
        await gradesApi.update(id, payload);
      } else {
        await gradesApi.create(payload);
      }
      navigate('/grades');
    } catch (err) {
      setError(err.message);
      if (err.code === 'GRADE_LOCKED' || err.code === 'GRADE_EDIT_WINDOW_EXPIRED') {
        setError(t('grades.lockedError'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (await confirm(t('grades.confirmDeleteGrade'))) {
      try {
        await gradesApi.delete(id);
        navigate('/grades');
      } catch (err) {
        setError(err.message);
      }
    }
  };

  if (loading) {
    return <FormLoading sections={2} fieldsPerSection={6} />;
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? t('grades.edit') : t('grades.add')}
        backTo="/grades"
      />

      {error && (
        <ErrorBanner message={error} onClose={() => setError(null)} />
      )}

      <form onSubmit={handleSubmit}>
        <FormSection title={t('grades.generalInfo')}><FormGrid gap="normal">
            <FormCol size={{ xs: 12, md: 6 }}>
              <AsyncSelect
                api={studentsApi}
                label={t('grades.student')}
                required
                disabled={isLocked}
                value={formData.student_id || null}
                onChange={handleSelectChange('student_id')}
                getOptionLabel={(s) => `${s.first_name} ${s.last_name}`}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <AsyncSelect
                api={subjectsApi}
                label={t('grades.subject')}
                required
                disabled={isLocked}
                value={formData.subject_id || null}
                onChange={handleSelectChange('subject_id')}
                getOptionLabel={(s) => s.name}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <AsyncSelect
                api={assignmentsApi}
                label={t('grades.assignment')}
                required
                disabled={isLocked}
                value={formData.assignment_id || null}
                onChange={handleSelectChange('assignment_id')}
                getOptionLabel={(a) => `${a.code} — ${a.teacher_name || a.subject_name || a.grade}`}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <AsyncSelect
                api={academicPeriodsApi}
                label={t('grades.period')}
                required
                disabled={isLocked}
                value={formData.academic_period_id || null}
                onChange={handleSelectChange('academic_period_id')}
                getOptionLabel={(p) => p.name}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label={t('grades.value')}
                name="grade_value"
                type="number"
                slotProps={{ htmlInput: { step: '0.01' } }}
                value={formData.grade_value}
                onChange={handleChange}
                required
                disabled={isLocked}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label={t('grades.letter')}
                name="grade_letter"
                value={formData.grade_letter || ''}
                onChange={handleChange}
                disabled={isLocked}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label={t('grades.weight')}
                name="weight"
                type="number"
                slotProps={{ htmlInput: { step: '0.01' } }}
                value={formData.weight}
                onChange={handleChange}
                disabled={isLocked}
              />
            </FormCol>
            <FormCol size={{ xs: 12 }}>
              <FormControl fullWidth disabled={isLocked}>
                <InputLabel>{t('grades.status')}</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label={t('grades.status')}
                >
                  <MenuItem value="DRAFT">{t('status.draft')}</MenuItem>
                  <MenuItem value="PUBLISHED">{t('status.published')}</MenuItem>
                  <MenuItem value="LOCKED">{t('status.locked')}</MenuItem>
                  <MenuItem value="UNLOCKED">{t('status.unlocked')}</MenuItem>
                </Select>
              </FormControl>
            </FormCol>
          </FormGrid>
        </FormSection>

        <FormActions>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={submitting || isLocked}
          >
            {submitting ? <CircularProgress size={24} /> : t('common.save')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<CancelIcon />}
            onClick={() => navigate('/grades')}
          >
            {t('common.cancel')}
          </Button>
        </FormActions>
      </form>
      {ConfirmDialog}
    </div>
  );
};

export default GradeFormPage;
