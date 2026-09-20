// FILE: frontend/src/features/students/pages/StudentFormPage.jsx
import { sx } from '../../../ui/sx';
import { FormSection, FormGrid, FormCol, FormActions, PageHeader, ErrorBanner, FormLoading } from '../../../components/FormKit';
import React, { useState, useEffect, useRef } from 'react';
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
  Avatar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Save as SaveIcon, XCircle as CancelIcon, Trash2 as DeleteIcon, Camera as PhotoCameraIcon } from 'lucide-react';
import studentsApi from '../api';
import branchesApi from '../../branches/api';
import academicYearsApi from '../../academicYears/api';
import useAuthImage from '../../../hooks/useAuthImage';

const emptyForm = {
  first_name: '',
  middle_name: '',
  last_name: '',
  second_last_name: '',
  identification_type: 'ID',
  identification_number: '',
  photo_url: '',
  email: '',
  phone: '',
  address: '',
  date_of_birth: '',
  gender: 'M',
  grade: '',
  section: '',
  branch_id: '',
  academic_year_id: '',
  enrollment_date: '',
  graduation_year: '',
  status: 'ACTIVE',
  notes: '',
};

const StudentFormPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const photoInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState(null);
  const [branches, setBranches] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  // photo_url ya no es una URL pública (ver backend/src/app.js); se pide con
  // el token vía GET /students/:id/photo cuando el estudiante ya tiene foto.
  const { blobUrl: photoBlobUrl } = useAuthImage(isEdit && formData.photo_url ? `/students/${id}/photo` : null);

  useEffect(() => {
    loadOptions();
    if (isEdit) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadOptions = async () => {
    try {
      const [branchesRes, yearsRes] = await Promise.allSettled([
        branchesApi.getAll(),
        academicYearsApi.getAll(),
      ]);
      if (branchesRes.status === 'fulfilled') {
        setBranches(branchesRes.value?.data?.data || branchesRes.value?.data || []);
      }
      if (yearsRes.status === 'fulfilled') {
        setAcademicYears(yearsRes.value?.data?.data || yearsRes.value?.data || []);
      }
    } catch (err) {
      // Non-fatal: the selects simply stay empty and the user can still
      // type a numeric id in the fallback fields below if needed.
      console.error('Error loading branches/academic years:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await studentsApi.getById(id);
      // `api.get` already unwraps axios' response.data, so the payload here
      // is the `{ success, data }` envelope from the backend. Reading the
      // envelope's `.data` (not the envelope itself) was the bug that made
      // every field show blank when editing an existing student.
      const student = response?.data || response;
      setFormData({
        ...emptyForm,
        ...student,
        date_of_birth: student.date_of_birth ? student.date_of_birth.substring(0, 10) : '',
        enrollment_date: student.enrollment_date ? student.enrollment_date.substring(0, 10) : '',
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

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !isEdit) return;

    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setError('Only JPG or PNG images are allowed for the student photo.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('The photo must not exceed 5MB.');
      return;
    }

    setUploadingPhoto(true);
    setError(null);
    try {
      const response = await studentsApi.uploadPhoto(id, file);
      const updated = response?.data || response;
      setFormData((prev) => ({ ...prev, photo_url: updated.photo_url }));
    } catch (err) {
      setError(err.message || 'Error uploading photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isEdit) {
        await studentsApi.update(id, formData);
      } else {
        await studentsApi.create(formData);
      }
      navigate('/students');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDeleteOpen(false);
    try {
      await studentsApi.delete(id);
      navigate('/students');
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return <FormLoading sections={2} fieldsPerSection={6} />;
  }

  const initials = `${formData.first_name?.[0] || ''}${formData.last_name?.[0] || ''}`.toUpperCase();


  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? t('students.edit') : t('students.add')}
        backTo="/students"
        onDelete={isEdit ? () => setConfirmDeleteOpen(true) : undefined}
        deleteLabel={t('common.delete')}
      />

      {error && (
        <ErrorBanner message={error} onClose={() => setError(null)} />
      )}

      <form onSubmit={handleSubmit}>
        <FormGrid gap="loose">
          {/* Photo + quick identity */}
          <FormCol size={{ xs: 12 }}>
            <FormSection bodyClassName="flex flex-wrap items-center gap-6">
              <Box style={sx({ position: 'relative' })}>
                <Avatar
                  src={photoBlobUrl || undefined}
                  style={sx({ width: 88, height: 88, bgcolor: '#ede9fe', color: '#4c1d95', fontSize: '1.75rem', fontWeight: 'bold' })}
                >
                  {!photoBlobUrl && (initials || '?')}
                </Avatar>
                {isEdit && (
                  <>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      style={{ display: 'none' }}
                      onChange={handlePhotoSelect}
                    />
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      startIcon={uploadingPhoto ? <CircularProgress size={14} color="inherit" /> : <PhotoCameraIcon fontSize="small" />}
                      style={sx({ position: 'absolute', bottom: -10, right: -10, minWidth: 0, borderRadius: '50%', p: 1 })}
                    />
                  </>
                )}
              </Box>
              <Box>
                <Typography variant="body2" color="textSecondary">
                  {isEdit ? formData.code : t('students.add')}
                </Typography>
                <Typography variant="h6" style={sx({ fontWeight: 700 })}>
                  {formData.first_name || formData.last_name
                    ? `${formData.first_name} ${formData.last_name}`
                    : t('students.add')}
                </Typography>
                {!isEdit && (
                  <Typography variant="caption" color="textSecondary">
                    {t('students.uploadPhoto')} — {t('common.save', { defaultValue: 'available after saving' })}
                  </Typography>
                )}
              </Box>
            </FormSection>
          </FormCol>

          {/* Personal Information */}
          <FormCol size={{ xs: 12 }}>
            <FormSection title={t('students.personalInfo')}><FormGrid gap="normal">
                <FormCol size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth required label={t('students.firstName')} name="first_name" value={formData.first_name} onChange={handleChange} />
                </FormCol>
                <FormCol size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label={t('students.middleName')} name="middle_name" value={formData.middle_name || ''} onChange={handleChange} />
                </FormCol>
                <FormCol size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth required label={t('students.lastName')} name="last_name" value={formData.last_name} onChange={handleChange} />
                </FormCol>
                <FormCol size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label={t('students.secondLastName')} name="second_last_name" value={formData.second_last_name || ''} onChange={handleChange} />
                </FormCol>
                <FormCol size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth required label={t('students.dateOfBirth')} name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                </FormCol>
                <FormCol size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>{t('students.gender')}</InputLabel>
                    <Select name="gender" value={formData.gender} onChange={handleChange} label={t('students.gender')}>
                      <MenuItem value="M">{t('students.male')}</MenuItem>
                      <MenuItem value="F">{t('students.female')}</MenuItem>
                      <MenuItem value="OTHER">{t('students.other')}</MenuItem>
                    </Select>
                  </FormControl>
                </FormCol>
                <FormCol size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>{t('students.identificationType')}</InputLabel>
                    <Select name="identification_type" value={formData.identification_type || 'ID'} onChange={handleChange} label={t('students.identificationType')}>
                      <MenuItem value="ID">{t('students.idTypeId')}</MenuItem>
                      <MenuItem value="PASSPORT">{t('students.idTypePassport')}</MenuItem>
                      <MenuItem value="BIRTH_CERTIFICATE">{t('students.idTypeBirthCertificate')}</MenuItem>
                      <MenuItem value="OTHER">{t('students.idTypeOther')}</MenuItem>
                    </Select>
                  </FormControl>
                </FormCol>
                <FormCol size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label={t('students.identificationNumber')} name="identification_number" value={formData.identification_number || ''} onChange={handleChange} />
                </FormCol>
              </FormGrid>
            </FormSection>
          </FormCol>

          {/* Contact Information */}
          <FormCol size={{ xs: 12 }}>
            <FormSection title={t('students.contactInfo')}><FormGrid gap="normal">
                <FormCol size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth required label={t('students.email')} name="email" type="email" value={formData.email} onChange={handleChange} />
                </FormCol>
                <FormCol size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label={t('students.phone')} name="phone" value={formData.phone || ''} onChange={handleChange} />
                </FormCol>
                <FormCol size={{ xs: 12 }}>
                  <TextField fullWidth label={t('students.address')} name="address" value={formData.address || ''} onChange={handleChange} />
                </FormCol>
              </FormGrid>
            </FormSection>
          </FormCol>

          {/* Academic Placement */}
          <FormCol size={{ xs: 12 }}>
            <FormSection title={t('students.academicInfo')}><FormGrid gap="normal">
                <FormCol size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('students.grade')}</InputLabel>
                    <Select name="grade" value={formData.grade || ''} onChange={handleChange} label={t('students.grade')}>
                      {['1ro', '2do', '3ro', '4to', '5to', '6to'].map((g) => (
                        <MenuItem key={g} value={g}>{g}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </FormCol>
                <FormCol size={{ xs: 12, md: 3 }}>
                  <TextField fullWidth label={t('students.section')} name="section" value={formData.section || ''} onChange={handleChange} />
                </FormCol>
                <FormCol size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('students.branch')}</InputLabel>
                    <Select name="branch_id" value={formData.branch_id || ''} onChange={handleChange} label={t('students.branch')}>
                      {branches.map((b) => (
                        <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </FormCol>
                <FormCol size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth required>
                    <InputLabel>{t('students.academicYear')}</InputLabel>
                    <Select name="academic_year_id" value={formData.academic_year_id || ''} onChange={handleChange} label={t('students.academicYear')}>
                      {academicYears.map((y) => (
                        <MenuItem key={y.id} value={y.id}>{y.name || y.year_label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </FormCol>
                <FormCol size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label={t('students.enrollmentDate')} name="enrollment_date" type="date" value={formData.enrollment_date} onChange={handleChange} slotProps={{ inputLabel: { shrink: true } }} />
                </FormCol>
                <FormCol size={{ xs: 12, md: 4 }}>
                  <TextField fullWidth label={t('students.graduationYear')} name="graduation_year" type="number" value={formData.graduation_year || ''} onChange={handleChange} />
                </FormCol>
                <FormCol size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>{t('students.status')}</InputLabel>
                    <Select name="status" value={formData.status} onChange={handleChange} label={t('students.status')}>
                      <MenuItem value="ACTIVE">{t('status.active')}</MenuItem>
                      <MenuItem value="INACTIVE">{t('status.inactive')}</MenuItem>
                      <MenuItem value="GRADUATED">{t('status.graduated')}</MenuItem>
                      <MenuItem value="WITHDRAWN">{t('status.withdrawn')}</MenuItem>
                      <MenuItem value="TRANSFERRED">{t('status.transferred')}</MenuItem>
                      <MenuItem value="SUSPENDED">{t('status.suspended')}</MenuItem>
                    </Select>
                  </FormControl>
                </FormCol>
              </FormGrid>
            </FormSection>
          </FormCol>

          {/* Additional Information */}
          <FormCol size={{ xs: 12 }}>
            <FormSection title={t('students.additionalInfo')}><TextField fullWidth multiline rows={3} label={t('students.notes')} name="notes" value={formData.notes || ''} onChange={handleChange} />
            </FormSection>
          </FormCol>
        </FormGrid>

        <FormActions>
          <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={submitting}>
            {submitting ? <CircularProgress size={24} /> : t('common.save')}
          </Button>
          <Button variant="outlined" startIcon={<CancelIcon />} onClick={() => navigate('/students')}>
            {t('common.cancel')}
          </Button>
        </FormActions>
      </form>

      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('students.confirmDeleteStudent')}</DialogContentText>
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

export default StudentFormPage;
