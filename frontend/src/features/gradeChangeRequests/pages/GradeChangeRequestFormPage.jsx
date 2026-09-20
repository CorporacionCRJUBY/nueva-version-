// FILE: frontend/src/features/gradeChangeRequests/pages/GradeChangeRequestFormPage.jsx
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
  CircularProgress,
  Alert,
} from '@mui/material';
import { Save as SaveIcon, XCircle as CancelIcon } from 'lucide-react';
import gradeChangeRequestsApi from '../api';

const GradeChangeRequestFormPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    grade_record_id: '',
    student_id: '',
    current_grade: '',
    requested_grade: '',
    reason: '',
  });

  useEffect(() => {
    if (isEdit) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await gradeChangeRequestsApi.getById(id);
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data }` envelope from the backend — read `.data`, not the envelope.
      const record = response?.data || response;
      setFormData((prev) => ({ ...prev, ...record }));
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
        await gradeChangeRequestsApi.update(id, formData);
      } else {
        await gradeChangeRequestsApi.create(formData);
      }
      navigate('/grade-change-requests');
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <FormLoading sections={2} fieldsPerSection={6} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? t('gradeChangeRequests.edit') : t('gradeChangeRequests.add')}
        backTo="/grade-change-requests"
      />

      <FormSection>
        {error && (
          <ErrorBanner message={error} />
        )}

        <form onSubmit={handleSubmit}>
          <FormGrid gap="normal">
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('gradeChangeRequests.gradeRecord')}
                name="grade_record_id"
                type="number"
                value={formData.grade_record_id}
                onChange={handleChange}
                required
                disabled={isEdit}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('gradeChangeRequests.student')}
                name="student_id"
                type="number"
                value={formData.student_id}
                onChange={handleChange}
                required
                disabled={isEdit}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('gradeChangeRequests.current')}
                name="current_grade"
                type="number"
                step="0.01"
                value={formData.current_grade}
                onChange={handleChange}
                required
                disabled={isEdit}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('gradeChangeRequests.requested')}
                name="requested_grade"
                type="number"
                step="0.01"
                value={formData.requested_grade}
                onChange={handleChange}
                required
              />
            </FormCol>
            <FormCol size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('gradeChangeRequests.reason')}
                name="reason"
                multiline
                rows={4}
                value={formData.reason}
                onChange={handleChange}
                required
                disabled={isEdit && formData.status !== 'PENDING'}
              />
            </FormCol>
          </FormGrid>

          <FormActions>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={submitting || (isEdit && formData.status !== 'PENDING')}
            >
              {submitting ? <CircularProgress size={24} /> : t('common.save')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={() => navigate('/grade-change-requests')}
            >
              {t('common.cancel')}
            </Button>
          </FormActions>
        </form>
      </FormSection>
    </div>
  );
};

export default GradeChangeRequestFormPage;