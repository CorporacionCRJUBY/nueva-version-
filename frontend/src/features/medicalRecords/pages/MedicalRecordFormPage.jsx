// FILE: frontend/src/features/medicalRecords/pages/MedicalRecordFormPage.jsx
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
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import { Save as SaveIcon, XCircle as CancelIcon, Trash2 as DeleteIcon } from 'lucide-react';
import medicalRecordsApi from '../api';
import AsyncSelect from '../../../components/AsyncSelect';
import studentsApi from '../../students/api';

const emptyForm = {
  student_id: '',
  medical_condition: '',
  allergies: '',
  medications: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  health_insurance: '',
  insurance_number: '',
  notes: '',
  last_checkup_date: '',
};

const MedicalRecordFormPage = () => {
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
      const response = await medicalRecordsApi.getById(id);
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data }` envelope from the backend — read `.data`, not the envelope.
      const record = response?.data || response;
      setFormData({ ...emptyForm, ...record, last_checkup_date: record.last_checkup_date ? record.last_checkup_date.substring(0, 10) : '' });
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
        await medicalRecordsApi.update(id, formData);
      } else {
        await medicalRecordsApi.create(formData);
      }
      navigate('/medical-records');
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (await confirm(t('medicalRecords.confirmDeleteRecord'))) {
      try {
        await medicalRecordsApi.delete(id);
        navigate('/medical-records');
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
        title={isEdit ? t('medicalRecords.edit') : t('medicalRecords.add')}
        backTo="/medical-records"
      />

      {error && (
        <ErrorBanner message={error} onClose={() => setError(null)} />
      )}

      <form onSubmit={handleSubmit}>
        <FormSection title={t('medicalRecords.generalInfo')}><FormGrid gap="normal">
            <FormCol size={{ xs: 12 }}>
              <AsyncSelect
                api={studentsApi}
                label={t('medicalRecords.student')}
                required
                value={formData.student_id || null}
                onChange={handleSelectChange('student_id')}
                getOptionLabel={(s) => `${s.first_name} ${s.last_name}`}
              />
            </FormCol>
            <FormCol size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('medicalRecords.condition')}
                name="medical_condition"
                value={formData.medical_condition}
                onChange={handleChange}
                placeholder={t('medicalRecords.conditionPlaceholder')}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('medicalRecords.allergies')}
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                placeholder={t('medicalRecords.allergiesPlaceholder')}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('medicalRecords.medications')}
                name="medications"
                value={formData.medications}
                onChange={handleChange}
                placeholder={t('medicalRecords.medicationsPlaceholder')}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('medicalRecords.emergencyContact')}
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleChange}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('medicalRecords.emergencyPhone')}
                name="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={handleChange}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('medicalRecords.healthInsurance')}
                name="health_insurance"
                value={formData.health_insurance}
                onChange={handleChange}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('medicalRecords.insuranceNumber')}
                name="insurance_number"
                value={formData.insurance_number}
                onChange={handleChange}
              />
            </FormCol>
            <FormCol size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('medicalRecords.lastCheckup')}
                name="last_checkup_date"
                type="date"
                value={formData.last_checkup_date}
                onChange={handleChange}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </FormCol>
            <FormCol size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('medicalRecords.notes')}
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
            onClick={() => navigate('/medical-records')}
          >
            {t('common.cancel')}
          </Button>
        </FormActions>
      </form>
      {ConfirmDialog}
    </div>
  );
};

export default MedicalRecordFormPage;
