// FILE: frontend/src/features/permissions/pages/PermissionFormPage.jsx
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Save as SaveIcon, XCircle as CancelIcon, Trash2 as DeleteIcon } from 'lucide-react';
import permissionsApi from '../api';

const PermissionFormPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [formData, setFormData] = useState({
    module: '',
    action: '',
    description: '',
  });

  useEffect(() => {
    if (isEdit) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await permissionsApi.getById(id);
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
        await permissionsApi.update(id, formData);
      } else {
        await permissionsApi.create(formData);
      }
      navigate('/permissions');
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <FormLoading sections={2} fieldsPerSection={6} />;
  }

  const handleDelete = async () => {
    setConfirmDeleteOpen(false);
    try {
      await permissionsApi.delete(id);
      navigate('/permissions');
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? t('permissions.edit') : t('permissions.add')}
        backTo="/permissions"
        onDelete={isEdit ? () => setConfirmDeleteOpen(true) : undefined}
        deleteLabel={t('common.delete')}
      />

      <FormSection>
        {error && (
          <ErrorBanner message={error} />
        )}

        <form onSubmit={handleSubmit}>
          <FormGrid gap="normal">
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{t('permissions.module')}</InputLabel>
                <Select
                  name="module"
                  value={formData.module}
                  onChange={handleChange}
                  label={t('permissions.module')}
                  required
                >
                  <MenuItem value="students">Students</MenuItem>
                  <MenuItem value="teachers">Teachers</MenuItem>
                  <MenuItem value="subjects">Subjects</MenuItem>
                  <MenuItem value="grades">Grades</MenuItem>
                  <MenuItem value="grade-change-requests">Grade Change Requests</MenuItem>
                  <MenuItem value="attendance">Attendance</MenuItem>
                  <MenuItem value="activity">Activity</MenuItem>
                  <MenuItem value="users">Users</MenuItem>
                  <MenuItem value="audit">Audit</MenuItem>
                  <MenuItem value="settings">Settings</MenuItem>
                  <MenuItem value="reports">Reports</MenuItem>
                  <MenuItem value="academic-history">Academic History</MenuItem>
                  <MenuItem value="academic-periods">Academic Periods</MenuItem>
                  <MenuItem value="academic-years">Academic Years</MenuItem>
                  <MenuItem value="assignments">Assignments</MenuItem>
                  <MenuItem value="branches">Branches</MenuItem>
                  <MenuItem value="calendar">Calendar</MenuItem>
                  <MenuItem value="credits">Credits</MenuItem>
                  <MenuItem value="documents">Documents</MenuItem>
                  <MenuItem value="gpa">GPA</MenuItem>
                  <MenuItem value="graduation">Graduation</MenuItem>
                  <MenuItem value="gransif">Gransif</MenuItem>
                  <MenuItem value="guardians">Guardians</MenuItem>
                  <MenuItem value="medical-records">Medical Records</MenuItem>
                  <MenuItem value="permissions">Permissions</MenuItem>
                  <MenuItem value="previous-schools">Previous Schools</MenuItem>
                  <MenuItem value="progress-reports">Progress Reports</MenuItem>
                  <MenuItem value="report-cards">Report Cards</MenuItem>
                  <MenuItem value="roles">Roles</MenuItem>
                  <MenuItem value="scholarships">Scholarships</MenuItem>
                  <MenuItem value="transcripts">Transcripts</MenuItem>
                  <MenuItem value="system">System</MenuItem>
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{t('permissions.action')}</InputLabel>
                <Select
                  name="action"
                  value={formData.action}
                  onChange={handleChange}
                  label={t('permissions.action')}
                  required
                >
                  <MenuItem value="view">{t('permissions.view')}</MenuItem>
                  <MenuItem value="create">{t('permissions.create')}</MenuItem>
                  <MenuItem value="edit">{t('permissions.edit')}</MenuItem>
                  <MenuItem value="delete">{t('permissions.delete')}</MenuItem>
                  <MenuItem value="generate">{t('permissions.generate')}</MenuItem>
                  <MenuItem value="approve">{t('permissions.approve')}</MenuItem>
                  <MenuItem value="reject">{t('permissions.reject')}</MenuItem>
                  <MenuItem value="validate">{t('permissions.validate', { defaultValue: 'Validate' })}</MenuItem>
                  <MenuItem value="manage">{t('permissions.manage', { defaultValue: 'Manage' })}</MenuItem>
                  <MenuItem value="request_change">{t('permissions.requestChange', { defaultValue: 'Request change' })}</MenuItem>
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('permissions.description')}
                name="description"
                value={formData.description}
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
              onClick={() => navigate('/permissions')}
            >
              {t('common.cancel')}
            </Button>
          </FormActions>
        </form>
      </FormSection>

      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('permissions.confirmDeletePermission')}</DialogContentText>
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

export default PermissionFormPage;