// FILE: frontend/src/features/transcripts/pages/TranscriptFormPage.jsx
import { sx } from '../../../ui/sx';
import { FormSection, FormGrid, FormCol, FormActions, PageHeader, ErrorBanner, FormLoading } from '../../../components/FormKit';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Save as SaveIcon, XCircle as CancelIcon, Trash2 as DeleteIcon } from 'lucide-react';
import transcriptsApi from '../api';
import studentsApi from '../../students/api';
import academicPeriodsApi from '../../academicPeriods/api';
import academicYearsApi from '../../academicYears/api';

const emptyForm = {
  student_id: '',
  academic_period_id: '',
  academic_year_id: '',
  transcript_type: 'OFFICIAL',
  status: 'DRAFT',
  notes: '',
};

const TranscriptFormPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [academicPeriods, setAcademicPeriods] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    loadOptions();
    if (isEdit) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadOptions = async () => {
    try {
      const [studentsRes, periodsRes, yearsRes] = await Promise.all([
        studentsApi.getAll({ pageSize: 1000 }),
        academicPeriodsApi.getAll({ pageSize: 1000 }),
        academicYearsApi.getAll({ pageSize: 1000 }),
      ]);
      setStudents(studentsRes?.data?.data || studentsRes?.data || []);
      setAcademicPeriods(periodsRes?.data?.data || periodsRes?.data || []);
      setAcademicYears(yearsRes?.data?.data || yearsRes?.data || []);
    } catch (err) {
      console.error('Error loading form options:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await transcriptsApi.getById(id);
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data }` envelope from the backend — read `.data`, not the envelope.
      const record = response?.data || response;
      setFormData({ ...emptyForm, ...record });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isEdit) {
        await transcriptsApi.update(id, formData);
      } else {
        await transcriptsApi.create(formData);
      }
      navigate('/transcripts');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDeleteOpen(false);
    try {
      await transcriptsApi.delete(id);
      navigate('/transcripts');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <FormLoading sections={2} fieldsPerSection={6} />;
  }

  // Once generated, a transcript's status changes only through the
  // "Generate" / "Reprint" / "Archive" actions on the list — never by
  // editing this field directly — so we never silently overwrite an
  // official document (per system rules).
  const canDelete = isEdit && formData.status === 'DRAFT';

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? t('transcripts.edit') : t('transcripts.add')}
        backTo="/transcripts"
        onDelete={isEdit ? () => setConfirmDeleteOpen(true) : undefined}
        deleteLabel={t('common.delete')}
      />

      {error && (
        <ErrorBanner message={error} onClose={() => setError(null)} />
      )}

      <form onSubmit={handleSubmit}>
        <FormGrid gap="loose">
          <FormCol size={{ xs: 12 }}>
            <FormSection title={t('transcripts.generalInfo')}><FormGrid gap="normal">
                <FormCol size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('transcripts.student')}</InputLabel>
                    <Select name="student_id" value={formData.student_id || ''} onChange={handleChange} label={t('transcripts.student')}>
                      {students.map((s) => (
                        <MenuItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </FormCol>
                <FormCol size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth>
                    <InputLabel>{t('transcripts.type')}</InputLabel>
                    <Select name="transcript_type" value={formData.transcript_type} onChange={handleChange} label={t('transcripts.type')}>
                      <MenuItem value="OFFICIAL">{t('transcripts.official')}</MenuItem>
                      <MenuItem value="UNOFFICIAL">{t('transcripts.unofficial')}</MenuItem>
                    </Select>
                  </FormControl>
                </FormCol>
                <FormCol size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('transcripts.period')}</InputLabel>
                    <Select name="academic_period_id" value={formData.academic_period_id || ''} onChange={handleChange} label={t('transcripts.period')}>
                      {academicPeriods.map((p) => (
                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </FormCol>
                <FormCol size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('transcripts.year')}</InputLabel>
                    <Select name="academic_year_id" value={formData.academic_year_id || ''} onChange={handleChange} label={t('transcripts.year')}>
                      {academicYears.map((y) => (
                        <MenuItem key={y.id} value={y.id}>{y.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </FormCol>
                <FormCol size={{ xs: 12 }}>
                  <FormControl fullWidth disabled={isEdit}>
                    <InputLabel>{t('transcripts.status')}</InputLabel>
                    <Select name="status" value={formData.status} onChange={handleChange} label={t('transcripts.status')}>
                      <MenuItem value="DRAFT">{t('status.draft')}</MenuItem>
                      <MenuItem value="OFFICIAL">{t('status.official')}</MenuItem>
                      <MenuItem value="ARCHIVED">{t('status.archived')}</MenuItem>
                      <MenuItem value="REPRINTED">{t('status.reprinted')}</MenuItem>
                    </Select>
                    {isEdit && (
                      <Typography variant="caption" color="text.secondary" style={sx({ mt: 0.5, ml: 1.5 })}>
                        {t('transcripts.statusHint')}
                      </Typography>
                    )}
                  </FormControl>
                </FormCol>
                <FormCol size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label={t('transcripts.notes')}
                    name="notes"
                    multiline
                    rows={3}
                    value={formData.notes || ''}
                    onChange={handleChange}
                  />
                </FormCol>
              </FormGrid>
            </FormSection>
          </FormCol>
        </FormGrid>

        <FormActions>
          <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={submitting}>
            {submitting ? <CircularProgress size={24} /> : t('common.save')}
          </Button>
          <Button variant="outlined" startIcon={<CancelIcon />} onClick={() => navigate('/transcripts')}>
            {t('common.cancel')}
          </Button>
        </FormActions>
      </form>

      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('transcripts.confirmDeleteReport')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default TranscriptFormPage;
