// FILE: frontend/src/features/users/pages/UserFormPage.jsx
import { sx } from '../../../ui/sx';
import { FormSection, FormGrid, FormCol, FormActions, PageHeader, ErrorBanner, FormLoading, SectionHeading } from '../../../components/FormKit';
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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Save as SaveIcon, XCircle as CancelIcon, Trash2 as DeleteIcon, KeyRound as PasswordIcon, EyeOff as VisibilityOffIcon, Eye as VisibilityIcon } from 'lucide-react';
import usersApi from '../api';
import rolesApi from '../../roles/api';
import branchesApi from '../../branches/api';

const emptyForm = {
  email: '',
  full_name: '',
  phone: '',
  role_id: '',
  branch_id: '',
  status: 'ACTIVE',
};

const UserFormPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [passwordData, setPasswordData] = useState({
    password: '',
    password_confirmation: '',
  });

  useEffect(() => {
    loadOptions();
    if (isEdit) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadOptions = async () => {
    try {
      const [rolesRes, branchesRes] = await Promise.all([
        rolesApi.getAll({ pageSize: 1000 }),
        branchesApi.getAll({ pageSize: 1000 }),
      ]);
      setRoles(rolesRes?.data?.data || rolesRes?.data || []);
      setBranches(branchesRes?.data?.data || branchesRes?.data || []);
    } catch (err) {
      console.error('Error loading form options:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await usersApi.getById(id);
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data }` envelope from the backend — read `.data`, not the envelope.
      // The backend no longer returns `password` at all (it's stripped server-side),
      // so spreading `record` here is safe and won't get resubmitted as a "new" password.
      const record = response?.data || response;
      setFormData((prev) => ({ ...emptyForm, ...prev, ...record }));
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

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.password && passwordData.password !== passwordData.password_confirmation) {
      setError(t('users.passwordMismatch'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const submitData = { ...formData };
      // Only send `password` when the user actually typed a new one —
      // formData itself never carries a password field (it's kept in
      // separate state), so there's no risk of resubmitting a stale hash.
      if (passwordData.password) {
        submitData.password = passwordData.password;
      }

      if (isEdit) {
        await usersApi.update(id, submitData);
      } else {
        await usersApi.create(submitData);
      }
      navigate('/users');
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDeleteOpen(false);
    try {
      await usersApi.delete(id);
      navigate('/users');
    } catch (error) {
      setError(error.message);
    }
  };

  if (loading) {
    return <FormLoading sections={2} fieldsPerSection={6} />;
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? t('users.edit') : t('users.add')}
        backTo="/users"
        onDelete={isEdit ? () => setConfirmDeleteOpen(true) : undefined}
        deleteLabel={t('common.delete')}
      />

      <FormSection>
        {error && (
          <ErrorBanner message={error} onClose={() => setError(null)} />
        )}

        <form onSubmit={handleSubmit}>
          <SectionHeading>t('users.generalInfo')</SectionHeading>
          <FormGrid gap="normal">
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('users.fullName')}
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('users.email')}
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('users.phone')}
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{t('users.role')}</InputLabel>
                <Select name="role_id" value={formData.role_id || ''} onChange={handleChange} label={t('users.role')}>
                  <MenuItem value="">{t('common.none')}</MenuItem>
                  {roles.map((r) => (
                    <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{t('users.branch')}</InputLabel>
                <Select name="branch_id" value={formData.branch_id || ''} onChange={handleChange} label={t('users.branch')}>
                  <MenuItem value="">{t('common.none')}</MenuItem>
                  {branches.map((b) => (
                    <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{t('users.status')}</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label={t('users.status')}
                >
                  <MenuItem value="ACTIVE">{t('status.active')}</MenuItem>
                  <MenuItem value="INACTIVE">{t('status.inactive')}</MenuItem>
                  <MenuItem value="SUSPENDED">{t('status.suspended')}</MenuItem>
                </Select>
              </FormControl>
            </FormCol>
          </FormGrid>


          <SectionHeading>t('users.passwordSection')</SectionHeading>

          <FormGrid gap="normal">
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={isEdit ? t('users.newPassword') : t('users.password')}
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={passwordData.password}
                onChange={handlePasswordChange}
                required={!isEdit}
                helperText={isEdit ? t('users.leaveBlankToKeep') : undefined}
                slotProps={{ input: {
                  endAdornment: (
                    <IconButton onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  ),
                } }}
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label={t('users.confirmPassword')}
                name="password_confirmation"
                type={showPassword ? 'text' : 'password'}
                value={passwordData.password_confirmation}
                onChange={handlePasswordChange}
                required={!isEdit || !!passwordData.password}
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
              onClick={() => navigate('/users')}
            >
              {t('common.cancel')}
            </Button>
          </FormActions>
        </form>
      </FormSection>

      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('users.confirmDeleteUser')}</DialogContentText>
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

export default UserFormPage;