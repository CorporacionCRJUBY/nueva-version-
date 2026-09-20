// FILE: frontend/src/features/attendance/pages/AttendanceFormPage.jsx
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
import AsyncSelect from '../../../components/AsyncSelect';
import attendanceApi from '../api';
import studentsApi from '../../students/api';
import assignmentsApi from '../../assignments/api';

const emptyForm = {
  assignment_id: '',
  student_id: '',
  date: '',
  status: 'P',
  check_in_time: '',
  check_out_time: '',
  notes: '',
};

const AttendanceFormPage = () => {
  const { t } = useTranslation();
  const [confirm, ConfirmDialog] = useConfirm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  // FIX (bitácora 2026-09-15, pendiente "pageSize=1000 en los selectores"):
  // ver la misma nota en GradeFormPage — estudiante y asignación ahora
  // buscan contra el servidor en vez de traer hasta 1000 filas cada uno.
  useEffect(() => {
    if (isEdit) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await attendanceApi.getById(id);
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

  const handleSelectChange = (name) => (selectedId) => {
    setFormData((prev) => ({ ...prev, [name]: selectedId }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isEdit) {
        await attendanceApi.update(id, formData);
      } else {
        await attendanceApi.create(formData);
      }
      navigate('/attendance');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (await confirm(t('attendance.confirmDeleteAttendance'))) {
      try {
        await attendanceApi.delete(id);
        navigate('/attendance');
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
        title={isEdit ? t('attendance.edit') : t('attendance.add')}
        backTo="/attendance"
      />

      <FormSection>
        {error && (
          <ErrorBanner message={error} />
        )}

        <form onSubmit={handleSubmit}>
          <FormGrid gap="normal">
            <FormCol size={{ xs: 12, md: 6 }}>
              <AsyncSelect
                api={assignmentsApi}
                label={t('attendance.assignment')}
                required
                value={formData.assignment_id || null}
                onChange={handleSelectChange('assignment_id')}
                getOptionLabel={(a) => `${a.code} — ${a.subject_name || a.grade}`}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <AsyncSelect
                api={studentsApi}
                label={t('attendance.student')}
                required
                value={formData.student_id || null}
                onChange={handleSelectChange('student_id')}
                getOptionLabel={(s) => `${s.first_name} ${s.last_name}`}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('attendance.date')}
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                required
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{t('attendance.status')}</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label={t('attendance.status')}
                >
                  <MenuItem value="P">{t('attendance.present')}</MenuItem>
                  <MenuItem value="O">{t('attendance.online')}</MenuItem>
                  <MenuItem value="E">{t('attendance.excused')}</MenuItem>
                  <MenuItem value="U">{t('attendance.unexcused')}</MenuItem>
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('attendance.checkIn')}
                name="check_in_time"
                type="time"
                value={formData.check_in_time || ''}
                onChange={handleChange}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('attendance.checkOut')}
                name="check_out_time"
                type="time"
                value={formData.check_out_time || ''}
                onChange={handleChange}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </FormCol>
            <FormCol size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('attendance.notes')}
                name="notes"
                multiline
                rows={3}
                value={formData.notes || ''}
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
              onClick={() => navigate('/attendance')}
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

export default AttendanceFormPage;
