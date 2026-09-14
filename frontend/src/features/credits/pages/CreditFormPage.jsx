// FILE: frontend/src/features/credits/pages/CreditFormPage.jsx
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
  Divider,
} from '@mui/material';
import { Save as SaveIcon, XCircle as CancelIcon, Trash2 as DeleteIcon } from 'lucide-react';
import creditsApi from '../api';
import studentsApi from '../../students/api';
import academicPeriodsApi from '../../academicPeriods/api';

const emptyForm = {
  student_id: '',
  academic_period_id: '',
  credit_type: 'ACADEMIC',
  credits_earned: 0,
  credits_required: 0,
  status: 'PENDING',
  notes: '',
};

const CreditFormPage = () => {
  const { t } = useTranslation();
  const [confirm, ConfirmDialog] = useConfirm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [academicPeriods, setAcademicPeriods] = useState([]);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    loadOptions();
    if (isEdit) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadOptions = async () => {
    try {
      const [studentsRes, periodsRes] = await Promise.all([
        studentsApi.getAll({ pageSize: 1000 }),
        academicPeriodsApi.getAll({ pageSize: 1000 }),
      ]);
      setStudents(studentsRes?.data || []);
      setAcademicPeriods(periodsRes?.data?.data || periodsRes?.data || []);
    } catch (err) {
      console.error('Error loading form options:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await creditsApi.getById(id);
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data }` envelope from the backend — read `.data`, not the envelope.
      const record = response?.data || response;
      setFormData({ ...emptyForm, ...record });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isEdit) {
        await creditsApi.update(id, formData);
      } else {
        await creditsApi.create(formData);
      }
      navigate('/credits');
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (await confirm(t('credits.confirmDeleteCredit'))) {
      try {
        await creditsApi.delete(id);
        navigate('/credits');
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
        title={isEdit ? t('credits.edit') : t('credits.add')}
        backTo="/credits"
      />

      {error && (
        <ErrorBanner message={error} onClose={() => setError(null)} />
      )}

      <form onSubmit={handleSubmit}>
        <FormSection title={t('credits.generalInfo')}><FormGrid gap="normal">
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>{t('credits.student')}</InputLabel>
                <Select name="student_id" value={formData.student_id || ''} onChange={handleChange} label={t('credits.student')}>
                  {students.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>{t('credits.period')}</InputLabel>
                <Select name="academic_period_id" value={formData.academic_period_id || ''} onChange={handleChange} label={t('credits.period')}>
                  {academicPeriods.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth>
                <InputLabel>{t('credits.type')}</InputLabel>
                <Select
                  name="credit_type"
                  value={formData.credit_type}
                  onChange={handleChange}
                  label={t('credits.type')}
                >
                  <MenuItem value="ACADEMIC">{t('credits.academic')}</MenuItem>
                  <MenuItem value="SOCIAL">{t('credits.social')}</MenuItem>
                  <MenuItem value="COMMUNITY">{t('credits.community')}</MenuItem>
                  <MenuItem value="ELECTIVE">{t('credits.elective')}</MenuItem>
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label={t('credits.earned')}
                name="credits_earned"
                type="number"
                step="0.01"
                value={formData.credits_earned}
                onChange={handleChange}
                required
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label={t('credits.required')}
                name="credits_required"
                type="number"
                step="0.01"
                value={formData.credits_required}
                onChange={handleChange}
              />
            </FormCol>
            <FormCol size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>{t('credits.status')}</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label={t('credits.status')}
                >
                  <MenuItem value="PENDING">{t('status.pending')}</MenuItem>
                  <MenuItem value="APPROVED">{t('status.approved')}</MenuItem>
                  <MenuItem value="REJECTED">{t('status.rejected')}</MenuItem>
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('credits.notes')}
                name="notes"
                multiline
                rows={3}
                value={formData.notes}
                onChange={handleChange}
              />
            </FormCol>
          </FormGrid>
        </FormSection>

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
            onClick={() => navigate('/credits')}
          >
            {t('common.cancel')}
          </Button>
        </FormActions>
      </form>
      {ConfirmDialog}
    </div>
  );
};

export default CreditFormPage;