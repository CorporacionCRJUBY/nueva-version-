// FILE: frontend/src/features/graduation/pages/GraduationFormPage.jsx
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
  FormControlLabel,
  Switch,
} from '@mui/material';
import { Save as SaveIcon, XCircle as CancelIcon, Trash2 as DeleteIcon } from 'lucide-react';
import graduationApi from '../api';
import AsyncSelect from '../../../components/AsyncSelect';
import studentsApi from '../../students/api';
import academicYearsApi from '../../academicYears/api';

const GraduationFormPage = () => {
  const { t } = useTranslation();
  const [confirm, ConfirmDialog] = useConfirm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [formData, setFormData] = useState({
    student_id: '',
    academic_year_id: '',
    graduation_date: '',
    status: 'PENDING',
    requirements_met: false,
    validation_notes: '',
    certificate_number: '',
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
      const [yearsRes] = await Promise.all([
        academicYearsApi.getAll({ pageSize: 1000 }),
      ]);
  // FIX (bitácora 2026-09-15, pendiente "pageSize=1000 en los selectores"):
  // estudiantes ahora busca contra el servidor (AsyncSelect); el resto de
  // catálogos de este formulario son listas chicas y acotadas (periodos,
  // años académicos) que no crecen con el número de estudiantes, así que
  // se quedan como <Select> con el catálogo completo.
      setAcademicYears(yearsRes?.data?.data || yearsRes?.data || []);
    } catch (err) {
      console.error('Error loading form options:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await graduationApi.getById(id);
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data }` envelope from the backend — read `.data`, not the envelope.
      const record = response?.data || response;
      setFormData((prev) => ({
        ...prev,
        ...record,
        graduation_date: record.graduation_date ? record.graduation_date.substring(0, 10) : '',
      }));
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
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
        await graduationApi.update(id, formData);
      } else {
        await graduationApi.create(formData);
      }
      navigate('/graduation');
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (await confirm(t('graduation.confirmDeleteRecord'))) {
      try {
        await graduationApi.delete(id);
        navigate('/graduation');
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
        title={isEdit ? t('graduation.edit') : t('graduation.add')}
        backTo="/graduation"
      />
        {isEdit && (
          <Button color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={handleDelete}>
            {t('common.delete')}
          </Button>
        )}
      </Box>

      <FormSection>
        {error && (
          <ErrorBanner message={error} />
        )}

        <form onSubmit={handleSubmit}>
          <FormGrid gap="normal">
            <FormCol size={{ xs: 12, md: 6 }}>
              <AsyncSelect
                api={studentsApi}
                label={t('graduation.student')}
                required
                value={formData.student_id || null}
                onChange={handleSelectChange('student_id')}
                getOptionLabel={(s) => `${s.first_name} ${s.last_name}`}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>{t('graduation.year')}</InputLabel>
                <Select name="academic_year_id" value={formData.academic_year_id || ''} onChange={handleChange} label={t('graduation.year')}>
                  {academicYears.map((y) => (
                    <MenuItem key={y.id} value={y.id}>{y.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('graduation.date')}
                name="graduation_date"
                type="date"
                value={formData.graduation_date}
                onChange={handleChange}
                required
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{t('graduation.status')}</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label={t('graduation.status')}
                >
                  <MenuItem value="PENDING">{t('status.pending')}</MenuItem>
                  <MenuItem value="VALIDATED">{t('status.validated')}</MenuItem>
                  <MenuItem value="COMPLETED">{t('status.completed')}</MenuItem>
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    name="requirements_met"
                    checked={formData.requirements_met}
                    onChange={handleChange}
                  />
                }
                label={t('graduation.requirementsMet')}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('graduation.certificate')}
                name="certificate_number"
                value={formData.certificate_number}
                onChange={handleChange}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('graduation.validationNotes')}
                name="validation_notes"
                multiline
                rows={3}
                value={formData.validation_notes}
                onChange={handleChange}
              />
            </FormCol>
          </FormGrid>

          <FormActions>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={24} /> : t('common.save')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={() => navigate('/graduation')}
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

export default GraduationFormPage;