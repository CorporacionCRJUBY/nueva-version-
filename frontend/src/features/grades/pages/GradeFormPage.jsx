// FILE: frontend/src/features/grades/pages/GradeFormPage.jsx
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
  Chip,
  Divider,
} from '@mui/material';
import { Save as SaveIcon, XCircle as CancelIcon, Lock as LockIcon, Trash2 as DeleteIcon } from 'lucide-react';
import gradesApi from '../api';
import studentsApi from '../../students/api';
import subjectsApi from '../../subjects/api';
import assignmentsApi from '../../assignments/api';
import academicPeriodsApi from '../../academicPeriods/api';

const emptyForm = {
  student_id: '',
  subject_id: '',
  assignment_id: '',
  academic_period_id: '',
  grade_value: '',
  grade_letter: '',
  weight: 1.0,
  status: 'DRAFT',
};

const GradeFormPage = () => {
  const { t } = useTranslation();
  const [confirm, ConfirmDialog] = useConfirm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
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
      const [studentsRes, subjectsRes, assignmentsRes, periodsRes] = await Promise.all([
        studentsApi.getAll({ pageSize: 1000 }),
        subjectsApi.getAll({ pageSize: 1000 }),
        assignmentsApi.getAll({ pageSize: 1000 }),
        academicPeriodsApi.getAll({ pageSize: 1000 }),
      ]);
      setStudents(studentsRes?.data || []);
      setSubjects(subjectsRes?.data?.data || subjectsRes?.data || []);
      setAssignments(assignmentsRes?.data || []);
      setAcademicPeriods(periodsRes?.data?.data || periodsRes?.data || []);
    } catch (err) {
      console.error('Error loading form options:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await gradesApi.getById(id);
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data }` envelope from the backend — read `.data`, not the envelope.
      const record = response?.data || response;
      setFormData({ ...emptyForm, ...record });
      setIsLocked(record.status === 'LOCKED');
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
        await gradesApi.update(id, formData);
      } else {
        await gradesApi.create(formData);
      }
      navigate('/grades');
    } catch (err) {
      setError(err.message);
      if (err.code === 'GRADE_LOCKED' || err.code === 'GRADE_EDIT_WINDOW_EXPIRED') {
        setError(t('grades.lockedError'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (await confirm(t('grades.confirmDeleteGrade'))) {
      try {
        await gradesApi.delete(id);
        navigate('/grades');
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
        title={isEdit ? t('grades.edit') : t('grades.add')}
        backTo="/grades"
      />

      {error && (
        <ErrorBanner message={error} onClose={() => setError(null)} />
      )}

      <form onSubmit={handleSubmit}>
        <FormSection title={t('grades.generalInfo')}><FormGrid gap="normal">
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required disabled={isLocked}>
                <InputLabel>{t('grades.student')}</InputLabel>
                <Select name="student_id" value={formData.student_id || ''} onChange={handleChange} label={t('grades.student')}>
                  {students.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required disabled={isLocked}>
                <InputLabel>{t('grades.subject')}</InputLabel>
                <Select name="subject_id" value={formData.subject_id || ''} onChange={handleChange} label={t('grades.subject')}>
                  {subjects.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required disabled={isLocked}>
                <InputLabel>{t('grades.assignment')}</InputLabel>
                <Select name="assignment_id" value={formData.assignment_id || ''} onChange={handleChange} label={t('grades.assignment')}>
                  {assignments.map((a) => (
                    <MenuItem key={a.id} value={a.id}>{a.code} — {a.teacher_name || a.subject_name || a.grade}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required disabled={isLocked}>
                <InputLabel>{t('grades.period')}</InputLabel>
                <Select name="academic_period_id" value={formData.academic_period_id || ''} onChange={handleChange} label={t('grades.period')}>
                  {academicPeriods.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label={t('grades.value')}
                name="grade_value"
                type="number"
                inputProps={{ step: '0.01' }}
                value={formData.grade_value}
                onChange={handleChange}
                required
                disabled={isLocked}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label={t('grades.letter')}
                name="grade_letter"
                value={formData.grade_letter || ''}
                onChange={handleChange}
                disabled={isLocked}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label={t('grades.weight')}
                name="weight"
                type="number"
                inputProps={{ step: '0.01' }}
                value={formData.weight}
                onChange={handleChange}
                disabled={isLocked}
              />
            </FormCol>
            <FormCol size={{ xs: 12 }}>
              <FormControl fullWidth disabled={isLocked}>
                <InputLabel>{t('grades.status')}</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label={t('grades.status')}
                >
                  <MenuItem value="DRAFT">{t('status.draft')}</MenuItem>
                  <MenuItem value="PUBLISHED">{t('status.published')}</MenuItem>
                  <MenuItem value="LOCKED">{t('status.locked')}</MenuItem>
                  <MenuItem value="UNLOCKED">{t('status.unlocked')}</MenuItem>
                </Select>
              </FormControl>
            </FormCol>
          </FormGrid>
        </FormSection>

        <FormActions>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={submitting || isLocked}
          >
            {submitting ? <CircularProgress size={24} /> : t('common.save')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<CancelIcon />}
            onClick={() => navigate('/grades')}
          >
            {t('common.cancel')}
          </Button>
        </FormActions>
      </form>
      {ConfirmDialog}
    </div>
  );
};

export default GradeFormPage;
