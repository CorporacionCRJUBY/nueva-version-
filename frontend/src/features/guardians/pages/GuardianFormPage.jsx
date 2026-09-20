// FILE: frontend/src/features/guardians/pages/GuardianFormPage.jsx
import { sx } from '../../../ui/sx';
import { FormSection, FormGrid, FormCol, FormActions, PageHeader, ErrorBanner, FormLoading } from '../../../components/FormKit';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  Divider,
} from '@mui/material';
import { Save as SaveIcon, XCircle as CancelIcon, Trash2 as DeleteIcon } from 'lucide-react';
import guardiansApi from '../api';
import AsyncSelect from '../../../components/AsyncSelect';
import studentsApi from '../../students/api';

const emptyForm = {
  student_id: '',
  first_name: '',
  last_name: '',
  relationship: '',
  identification: '',
  phone: '',
  secondary_phone: '',
  email: '',
  address: '',
  is_emergency_contact: false,
  is_primary: false,
  authorized_pickup: false,
  status: 'ACTIVE',
  notes: '',
};

const GuardianFormPage = () => {
  const { t } = useTranslation();
  const [confirm, ConfirmDialog] = useConfirm();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    if (isEdit) {
      loadData();
    } else {
      const studentIdParam = searchParams.get('studentId');
      if (studentIdParam) {
        setFormData((prev) => ({ ...prev, student_id: Number(studentIdParam) }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // FIX (bitácora 2026-09-15, pendiente "pageSize=1000 en los selectores"):
  // el catálogo de estudiantes es el que más crece con el uso normal del
  // colegio, así que este campo ahora busca contra el servidor en vez de
  // traer hasta 1000 filas cada vez que se abre el formulario.
  const loadData = async () => {
    setLoading(true);
    try {
      const response = await guardiansApi.getById(id);
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
        await guardiansApi.update(id, formData);
      } else {
        await guardiansApi.create(formData);
      }
      navigate('/guardians');
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (await confirm(t('guardians.confirmDeleteGuardian'))) {
      try {
        await guardiansApi.delete(id);
        navigate('/guardians');
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
        title={isEdit ? t('guardians.edit') : t('guardians.add')}
        backTo="/guardians"
      />

      {error && (
        <ErrorBanner message={error} onClose={() => setError(null)} />
      )}

      <form onSubmit={handleSubmit}>
        <FormSection title={t('guardians.generalInfo')}><FormGrid gap="normal">
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('guardians.firstName')}
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('guardians.lastName')}
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <AsyncSelect
                api={studentsApi}
                label={t('guardians.student')}
                required
                value={formData.student_id || null}
                onChange={handleSelectChange('student_id')}
                getOptionLabel={(s) => `${s.first_name} ${s.last_name}`}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>{t('guardians.relationship')}</InputLabel>
                <Select name="relationship" value={formData.relationship || ''} onChange={handleChange} label={t('guardians.relationship')}>
                  <MenuItem value="Padre">{t('guardians.father')}</MenuItem>
                  <MenuItem value="Madre">{t('guardians.mother')}</MenuItem>
                  <MenuItem value="Tutor">{t('guardians.tutor')}</MenuItem>
                  <MenuItem value="Abuelo">{t('guardians.grandfather')}</MenuItem>
                  <MenuItem value="Abuela">{t('guardians.grandmother')}</MenuItem>
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('guardians.identification')}
                name="identification"
                value={formData.identification || ''}
                onChange={handleChange}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{t('guardians.status')}</InputLabel>
                <Select name="status" value={formData.status || 'ACTIVE'} onChange={handleChange} label={t('guardians.status')}>
                  <MenuItem value="ACTIVE">{t('status.active')}</MenuItem>
                  <MenuItem value="INACTIVE">{t('status.inactive')}</MenuItem>
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('guardians.phone')}
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('guardians.secondaryPhone')}
                name="secondary_phone"
                value={formData.secondary_phone || ''}
                onChange={handleChange}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('guardians.email')}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
            </FormCol>
            <FormCol size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('guardians.address')}
                name="address"
                value={formData.address}
                onChange={handleChange}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    name="is_primary"
                    checked={formData.is_primary}
                    onChange={handleChange}
                  />
                }
                label={t('guardians.isPrimary')}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    name="is_emergency_contact"
                    checked={formData.is_emergency_contact}
                    onChange={handleChange}
                  />
                }
                label={t('guardians.isEmergency')}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    name="authorized_pickup"
                    checked={formData.authorized_pickup}
                    onChange={handleChange}
                  />
                }
                label={t('guardians.authorizedPickup')}
              />
            </FormCol>
            <FormCol size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('guardians.notes')}
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
            onClick={() => navigate('/guardians')}
          >
            {t('common.cancel')}
          </Button>
        </FormActions>
      </form>
      {ConfirmDialog}
    </div>
  );
};

export default GuardianFormPage;
