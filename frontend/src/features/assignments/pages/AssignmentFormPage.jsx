// FILE: frontend/src/features/assignments/pages/AssignmentFormPage.jsx
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
import assignmentsApi from '../api';
import teachersApi from '../../teachers/api';
import subjectsApi from '../../subjects/api';
import branchesApi from '../../branches/api';
import academicYearsApi from '../../academicYears/api';

// Grade levels used consistently across Students, Subjects and Assignments
// (elementary grade naming, matching the seeded data and the rest of the system).
const GRADE_OPTIONS = ['1ro', '2do', '3ro', '4to', '5to', '6to'];

const emptyForm = {
  teacher_id: '',
  subject_id: '',
  grade: '',
  section: '',
  branch_id: '',
  academic_year_id: '',
  schedule: '',
  status: 'ACTIVE',
};

const AssignmentFormPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [branches, setBranches] = useState([]);
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
      const [teachersRes, subjectsRes, branchesRes, yearsRes] = await Promise.all([
        teachersApi.getAll({ pageSize: 1000 }),
        subjectsApi.getAll({ pageSize: 1000 }),
        branchesApi.getAll({ pageSize: 1000 }),
        academicYearsApi.getAll({ pageSize: 1000 }),
      ]);
      setTeachers(teachersRes?.data?.data || teachersRes?.data || []);
      setSubjects(subjectsRes?.data?.data || subjectsRes?.data || []);
      setBranches(branchesRes?.data?.data || branchesRes?.data || []);
      setAcademicYears(yearsRes?.data?.data || yearsRes?.data || []);
    } catch (err) {
      console.error('Error loading form options:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await assignmentsApi.getById(id);
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
        await assignmentsApi.update(id, formData);
      } else {
        await assignmentsApi.create(formData);
      }
      navigate('/assignments');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDeleteOpen(false);
    try {
      await assignmentsApi.delete(id);
      navigate('/assignments');
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
        title={isEdit ? t('assignments.edit') : t('assignments.add')}
        backTo="/assignments"
        onDelete={isEdit ? () => setConfirmDeleteOpen(true) : undefined}
        deleteLabel={t('common.delete')}
      />

      {error && (
        <ErrorBanner message={error} onClose={() => setError(null)} />
      )}

      <form onSubmit={handleSubmit}>
        <FormGrid gap="loose">
          {/* Assignment Information */}
          <FormCol size={{ xs: 12 }}>
            <FormSection title={t('assignments.generalInfo')}><FormGrid gap="normal">
                <FormCol size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('assignments.teacher')}</InputLabel>
                    <Select name="teacher_id" value={formData.teacher_id || ''} onChange={handleChange} label={t('assignments.teacher')}>
                      {teachers.map((tch) => (
                        <MenuItem key={tch.id} value={tch.id}>{tch.first_name} {tch.last_name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </FormCol>
                <FormCol size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('assignments.subject')}</InputLabel>
                    <Select name="subject_id" value={formData.subject_id || ''} onChange={handleChange} label={t('assignments.subject')}>
                      {subjects.map((s) => (
                        <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </FormCol>
                <FormCol size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('assignments.grade')}</InputLabel>
                    <Select name="grade" value={formData.grade || ''} onChange={handleChange} label={t('assignments.grade')}>
                      {GRADE_OPTIONS.map((g) => (
                        <MenuItem key={g} value={g}>{g}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </FormCol>
                <FormCol size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label={t('assignments.section')} name="section" value={formData.section || ''} onChange={handleChange} />
                </FormCol>
                <FormCol size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>{t('assignments.status')}</InputLabel>
                    <Select name="status" value={formData.status} onChange={handleChange} label={t('assignments.status')}>
                      <MenuItem value="ACTIVE">{t('status.active')}</MenuItem>
                      <MenuItem value="INACTIVE">{t('status.inactive')}</MenuItem>
                    </Select>
                  </FormControl>
                </FormCol>
              </FormGrid>
            </FormSection>
          </FormCol>

          {/* Academic Context */}
          <FormCol size={{ xs: 12 }}>
            <FormSection title={t('assignments.academicInfo')}><FormGrid gap="normal">
                <FormCol size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('assignments.branch')}</InputLabel>
                    <Select name="branch_id" value={formData.branch_id || ''} onChange={handleChange} label={t('assignments.branch')}>
                      {branches.map((b) => (
                        <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </FormCol>
                <FormCol size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('assignments.academicYear')}</InputLabel>
                    <Select name="academic_year_id" value={formData.academic_year_id || ''} onChange={handleChange} label={t('assignments.academicYear')}>
                      {academicYears.map((y) => (
                        <MenuItem key={y.id} value={y.id}>{y.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </FormCol>
                <FormCol size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label={t('assignments.schedule')}
                    name="schedule"
                    value={formData.schedule || ''}
                    onChange={handleChange}
                    placeholder="e.g., Lunes y Miércoles 8:00-10:00"
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
          <Button variant="outlined" startIcon={<CancelIcon />} onClick={() => navigate('/assignments')}>
            {t('common.cancel')}
          </Button>
        </FormActions>
      </form>

      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('assignments.confirmDeleteAssignment')}</DialogContentText>
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

export default AssignmentFormPage;
