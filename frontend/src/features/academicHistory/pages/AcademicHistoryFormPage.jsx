// FILE: frontend/src/features/academicHistory/pages/AcademicHistoryFormPage.jsx
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
} from '@mui/material';
import { Save as SaveIcon, XCircle as CancelIcon, Trash2 as DeleteIcon } from 'lucide-react';
import academicHistoryApi from '../api';
import AsyncSelect from '../../../components/AsyncSelect';
import studentsApi from '../../students/api';
import subjectsApi from '../../subjects/api';
import academicPeriodsApi from '../../academicPeriods/api';
import academicYearsApi from '../../academicYears/api';

const AcademicHistoryFormPage = () => {
  const { t } = useTranslation();
  const [confirm, ConfirmDialog] = useConfirm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [academicPeriods, setAcademicPeriods] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [formData, setFormData] = useState({
    student_id: '',
    academic_period_id: '',
    academic_year_id: '',
    subject_id: '',
    grade_value: '',
    grade_letter: '',
    status: 'PUBLISHED',
    notes: '',
  });

  useEffect(() => {
    loadOptions();
    if (isEdit) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadOptions = async () => {
    try {
      const [subjectsRes, periodsRes, yearsRes] = await Promise.all([
        subjectsApi.getAll({ pageSize: 1000 }),
        academicPeriodsApi.getAll({ pageSize: 1000 }),
        academicYearsApi.getAll({ pageSize: 1000 }),
      ]);
  // FIX (bitácora 2026-09-15, pendiente "pageSize=1000 en los selectores"):
  // estudiantes ahora busca contra el servidor (AsyncSelect); el resto de
  // catálogos de este formulario son listas chicas y acotadas (periodos,
  // años académicos) que no crecen con el número de estudiantes, así que
  // se quedan como <Select> con el catálogo completo.
      setSubjects(subjectsRes?.data?.data || subjectsRes?.data || []);
      setAcademicPeriods(periodsRes?.data?.data || periodsRes?.data || []);
      setAcademicYears(yearsRes?.data?.data || yearsRes?.data || []);
    } catch (err) {
      console.error('Error loading form options:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await academicHistoryApi.getById(id);
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data }` envelope from the backend — read `.data`, not the envelope.
      const record = response?.data || response;
      setFormData((prev) => ({ ...prev, ...record }));
      setIsLocked(record.status === 'LOCKED');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name) => (selectedId) => {
    setFormData((prev) => ({ ...prev, [name]: selectedId }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isEdit) {
        // Bug fix: academicHistoryApi.update() previously didn't exist at
        // all, so submitting an edit crashed immediately in the browser.
        await academicHistoryApi.update(id, formData);
      } else {
        await academicHistoryApi.create(formData);
      }
      navigate('/academic-history');
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (await confirm(t('academicHistory.confirmDeleteRecord'))) {
      try {
        // Bug fix: academicHistoryApi.delete() previously didn't exist at
        // all, and there was no delete button on this form either.
        await academicHistoryApi.delete(id);
        navigate('/academic-history');
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
      <Box style={sx({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 })}>
        <PageHeader
        title={isEdit ? t('academicHistory.edit') : t('academicHistory.add')}
        backTo="/academic-history"
      />
        {isEdit && !isLocked && (
          <Button color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={handleDelete}>
            {t('common.delete')}
          </Button>
        )}
      </Box>

      <FormSection>
        {error && (
          <ErrorBanner message={error} />
        )}
        {isLocked && (
          <Alert severity="warning" style={sx({ mb: 2 })}>
            {t('academicHistory.lockedHint')}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <FormGrid gap="normal">
            <FormCol size={{ xs: 12, md: 6 }}>
              <AsyncSelect
                api={studentsApi}
                label={t('academicHistory.student')}
                required
                disabled={isLocked}
                value={formData.student_id || null}
                onChange={handleSelectChange('student_id')}
                getOptionLabel={(s) => `${s.first_name} ${s.last_name}`}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required disabled={isLocked}>
                <InputLabel>{t('academicHistory.subject')}</InputLabel>
                <Select name="subject_id" value={formData.subject_id || ''} onChange={handleChange} label={t('academicHistory.subject')}>
                  {subjects.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required disabled={isLocked}>
                <InputLabel>{t('academicHistory.period')}</InputLabel>
                <Select name="academic_period_id" value={formData.academic_period_id || ''} onChange={handleChange} label={t('academicHistory.period')}>
                  {academicPeriods.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required disabled={isLocked}>
                <InputLabel>{t('academicHistory.year')}</InputLabel>
                <Select name="academic_year_id" value={formData.academic_year_id || ''} onChange={handleChange} label={t('academicHistory.year')}>
                  {academicYears.map((y) => (
                    <MenuItem key={y.id} value={y.id}>{y.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label={t('academicHistory.grade')}
                name="grade_value"
                type="number"
                value={formData.grade_value}
                onChange={handleChange}
                required
                disabled={isLocked}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label={t('academicHistory.letter')}
                name="grade_letter"
                value={formData.grade_letter}
                onChange={handleChange}
                disabled={isLocked}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth disabled={isLocked}>
                <InputLabel>{t('academicHistory.status')}</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label={t('academicHistory.status')}
                >
                  <MenuItem value="DRAFT">{t('status.draft')}</MenuItem>
                  <MenuItem value="PUBLISHED">{t('status.published')}</MenuItem>
                  <MenuItem value="LOCKED">{t('status.locked')}</MenuItem>
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('academicHistory.notes')}
                name="notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                disabled={isLocked}
              />
            </FormCol>
          </FormGrid>

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
              onClick={() => navigate('/academic-history')}
            >
              {t('common.cancel')}
            </Button>
          </FormActions>
        </form>
      </FormSection>
      {ConfirmDialog}
    </div>
  );
};

export default AcademicHistoryFormPage;
