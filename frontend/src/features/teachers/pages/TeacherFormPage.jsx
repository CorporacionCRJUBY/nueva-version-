// FILE: frontend/src/features/teachers/pages/TeacherFormPage.jsx
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
import teachersApi from '../api';
import branchesApi from '../../branches/api';

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  specialization: '',
  hire_date: '',
  branch_id: '',
  status: 'ACTIVE',
  notes: '',
};

const TeacherFormPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
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
      const response = await branchesApi.getAll();
      setBranches(response?.data?.data || response?.data || []);
    } catch (err) {
      // Non-fatal: the select simply stays empty.
      console.error('Error loading branches:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await teachersApi.getById(id);
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data }` envelope from the backend — read `.data`, not the envelope.
      const record = response?.data || response;
      setFormData({
        ...emptyForm,
        ...record,
        hire_date: record.hire_date ? record.hire_date.substring(0, 10) : '',
      });
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
        await teachersApi.update(id, formData);
      } else {
        await teachersApi.create(formData);
      }
      navigate('/teachers');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDeleteOpen(false);
    try {
      await teachersApi.delete(id);
      navigate('/teachers');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <FormLoading sections={2} fieldsPerSection={6} />;
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? t('teachers.edit') : t('teachers.add')}
        backTo="/teachers"
        onDelete={isEdit ? () => setConfirmDeleteOpen(true) : undefined}
        deleteLabel={t('common.delete')}
      />

      {error && (
        <ErrorBanner message={error} onClose={() => setError(null)} />
      )}

      <form onSubmit={handleSubmit}>
        <FormGrid gap="loose">
          {/* Personal Information */}
          <FormCol size={{ xs: 12 }}>
            <FormSection title={t('teachers.personalInfo')}><FormGrid gap="normal">
                <FormCol size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth required label={t('teachers.firstName')} name="first_name" value={formData.first_name} onChange={handleChange} />
                </FormCol>
                <FormCol size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth required label={t('teachers.lastName')} name="last_name" value={formData.last_name} onChange={handleChange} />
                </FormCol>
                <FormCol size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label={t('teachers.specialization')} name="specialization" value={formData.specialization || ''} onChange={handleChange} />
                </FormCol>
              </FormGrid>
            </FormSection>
          </FormCol>

          {/* Contact Information */}
          <FormCol size={{ xs: 12 }}>
            <FormSection title={t('teachers.contactInfo')}><FormGrid gap="normal">
                <FormCol size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth required label={t('teachers.email')} name="email" type="email" value={formData.email} onChange={handleChange} />
                </FormCol>
                <FormCol size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label={t('teachers.phone')} name="phone" value={formData.phone || ''} onChange={handleChange} />
                </FormCol>
              </FormGrid>
            </FormSection>
          </FormCol>

          {/* Employment Information */}
          <FormCol size={{ xs: 12 }}>
            <FormSection title={t('teachers.employmentInfo')}><FormGrid gap="normal">
                <FormCol size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('teachers.branch')}</InputLabel>
                    <Select name="branch_id" value={formData.branch_id || ''} onChange={handleChange} label={t('teachers.branch')}>
                      {branches.map((b) => (
                        <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </FormCol>
                <FormCol size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth required label={t('teachers.hireDate')} name="hire_date" type="date" value={formData.hire_date} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                </FormCol>
                <FormCol size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>{t('teachers.status')}</InputLabel>
                    <Select name="status" value={formData.status} onChange={handleChange} label={t('teachers.status')}>
                      <MenuItem value="ACTIVE">{t('status.active')}</MenuItem>
                      <MenuItem value="INACTIVE">{t('status.inactive')}</MenuItem>
                    </Select>
                  </FormControl>
                </FormCol>
              </FormGrid>
            </FormSection>
          </FormCol>

          {/* Additional Information */}
          <FormCol size={{ xs: 12 }}>
            <FormSection title={t('teachers.additionalInfo')}><TextField fullWidth multiline rows={3} label={t('teachers.notes')} name="notes" value={formData.notes || ''} onChange={handleChange} />
            </FormSection>
          </FormCol>
        </FormGrid>

        <FormActions>
          <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={submitting}>
            {submitting ? <CircularProgress size={24} /> : t('common.save')}
          </Button>
          <Button variant="outlined" startIcon={<CancelIcon />} onClick={() => navigate('/teachers')}>
            {t('common.cancel')}
          </Button>
        </FormActions>
      </form>

      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('teachers.confirmDeleteTeacher')}</DialogContentText>
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

export default TeacherFormPage;
