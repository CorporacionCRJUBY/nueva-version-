// FILE: frontend/src/pages/Profile.jsx
import { sx } from '../ui/sx';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Avatar,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
} from '@mui/material';
import { Save as SaveIcon, Eye as Visibility, EyeOff as VisibilityOff, Camera as PhotoCamera, Shield as ShieldIcon, Copy as ContentCopyIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/axiosClient';

const ProfilePage = () => {
  const { t } = useTranslation();
  const { user, refreshUser, setupTwoFactor, confirmTwoFactor, disableTwoFactor, regenerateBackupCodes } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // --- 2FA (auditoria hallazgo bajo #2) ----------------------------------
  // `setupData` holds the QR/secret while the "enable" dialog is open;
  // `backupCodes` holds a freshly (re)generated set to show once, either
  // right after confirming setup or after regenerating them explicitly.
  const [twoFaDialog, setTwoFaDialog] = useState(null); // 'setup' | 'disable' | 'regenerate' | null
  const [setupData, setSetupData] = useState(null);
  const [setupCode, setSetupCode] = useState('');
  const [twoFaPassword, setTwoFaPassword] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);
  const [twoFaError, setTwoFaError] = useState(null);
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  // FIX (auditoria hallazgo bajo B7): los setTimeout que ocultan el Alert de
  // éxito no tenían cleanup. Se guardan en un ref para cancelar el pendiente
  // antes de programar otro y limpiarlo al desmontar el componente.
  const successTimeoutRef = useRef(null);

  const showSuccessBrief = () => {
    setSuccess(true);
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    successTimeoutRef.current = setTimeout(() => setSuccess(false), 3000);
  };

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const closeTwoFaDialog = () => {
    setTwoFaDialog(null);
    setSetupData(null);
    setSetupCode('');
    setTwoFaPassword('');
    setTwoFaError(null);
  };

  const openEnableDialog = async () => {
    setTwoFaError(null);
    setTwoFaLoading(true);
    try {
      const data = await setupTwoFactor();
      setSetupData(data);
      setTwoFaDialog('setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleConfirmSetup = async (e) => {
    e.preventDefault();
    setTwoFaError(null);
    setTwoFaLoading(true);
    try {
      const data = await confirmTwoFactor(setupCode.trim());
      setBackupCodes(data.backupCodes);
      setTwoFaDialog('backupCodes');
      setSuccess(false);
    } catch (err) {
      setTwoFaError(err.message || t('profile.security.invalidCode'));
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleDisableTwoFactor = async (e) => {
    e.preventDefault();
    setTwoFaError(null);
    setTwoFaLoading(true);
    try {
      await disableTwoFactor(twoFaPassword);
      closeTwoFaDialog();
      showSuccessBrief();
    } catch (err) {
      setTwoFaError(err.message || t('profile.security.invalidPassword'));
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async (e) => {
    e.preventDefault();
    setTwoFaError(null);
    setTwoFaLoading(true);
    try {
      const data = await regenerateBackupCodes(twoFaPassword);
      setBackupCodes(data.backupCodes);
      setTwoFaDialog('backupCodes');
      setTwoFaPassword('');
    } catch (err) {
      setTwoFaError(err.message || t('profile.security.invalidPassword'));
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleFinishBackupCodes = () => {
    setBackupCodes(null);
    closeTwoFaDialog();
    refreshUser();
  };

  const handleCopyBackupCodes = () => {
    if (backupCodes) {
      navigator.clipboard?.writeText(backupCodes.join('\n'));
    }
  };

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

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
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await api.put('/users/profile', formData);
      await refreshUser();
      showSuccessBrief();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError(t('profile.passwordsDoNotMatch'));
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await api.post('/users/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      setSuccess(true);
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      showSuccessBrief();
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box style={sx({ p: 3 })}>
      <Typography variant="h4" className="gradient-text" gutterBottom style={sx({ fontWeight: 800 })}>
        {t('profile.title')}
      </Typography>

      {error && (
        <Alert severity="error" style={sx({ mb: 2 })}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" style={sx({ mb: 2 })}>
          {t('profile.saveSuccess')}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Perfil */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card style={sx({ overflow: 'hidden' })}>
            <Box style={sx({ height: 72, backgroundImage: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)' })} />
            <CardContent style={sx({ textAlign: 'center', mt: -7 })}>
              <Avatar
                style={sx({
                  width: 96,
                  height: 96,
                  mx: 'auto',
                  mb: 2,
                  backgroundImage: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                  fontSize: 40,
                  border: '4px solid #fff',
                  boxShadow: '0 6px 20px rgba(58,28,118,0.10), 0 2px 8px rgba(58,28,118,0.06)',
                })}
              >
                {user?.full_name?.charAt(0) || 'U'}
              </Avatar>
              <Typography variant="h6" style={sx({ fontWeight: 700 })}>{user?.full_name}</Typography>
              <Typography variant="body2" color="textSecondary">
                {user?.email}
              </Typography>
              <Typography variant="caption" color="textSecondary" style={sx([{ mt: 1 }, { display: 'block' }])}>
                {t('profile.memberSince')}: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
              </Typography>
              <Divider style={sx({ my: 2 })} />
              <Typography variant="body2" color="textSecondary">
                <strong>{t('profile.roles')}:</strong> {user?.roles?.join(', ') || '-'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                <strong>{t('profile.permissions')}:</strong> {user?.permissions?.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Datos de Perfil */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper style={sx({ p: 3 })}>
            <Typography variant="h6" gutterBottom>
              {t('profile.personalInfo')}
            </Typography>
            <Divider style={sx({ mb: 2 })} />

            <form onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label={t('profile.fullName')}
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={t('profile.email')}
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={t('profile.phone')}
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </Grid>
              </Grid>

              <Box style={sx({ mt: 3 })}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={24} /> : t('common.save')}
                </Button>
              </Box>
            </form>

            <Divider style={sx({ my: 4 })} />

            <Typography variant="h6" gutterBottom>
              {t('profile.changePassword')}
            </Typography>
            <Divider style={sx({ mb: 2 })} />

            <form onSubmit={handlePasswordSubmit}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label={t('profile.currentPassword')}
                    name="current_password"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.current_password}
                    onChange={handlePasswordChange}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={t('profile.newPassword')}
                    name="new_password"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.new_password}
                    onChange={handlePasswordChange}
                    required
                    slotProps={{ input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label={t('profile.confirmPassword')}
                    name="confirm_password"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.confirm_password}
                    onChange={handlePasswordChange}
                    required
                  />
                </Grid>
              </Grid>

              <Box style={sx({ mt: 3 })}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={24} /> : t('profile.updatePassword')}
                </Button>
              </Box>
            </form>

            <Divider style={sx({ my: 4 })} />

            {/* FIX (auditoria hallazgo bajo #2 - falta de 2FA): autoservicio
                de activación/desactivación del segundo factor. */}
            <Stack direction="row" spacing={1} style={sx([{ mb: 1 }, { alignItems: 'center' }])}>
              <ShieldIcon color={user?.twofa_enabled ? 'success' : 'disabled'} />
              <Typography variant="h6">{t('profile.security.title')}</Typography>
            </Stack>
            <Divider style={sx({ mb: 2 })} />

            <Typography variant="body2" color="textSecondary" style={sx({ mb: 2 })}>
              {t('profile.security.description')}
            </Typography>

            <Alert severity={user?.twofa_enabled ? 'success' : 'info'} style={sx({ mb: 2 })}>
              {user?.twofa_enabled ? t('profile.security.statusEnabled') : t('profile.security.statusDisabled')}
            </Alert>

            <Stack direction="row" spacing={2} useFlexGap style={sx({ flexWrap: 'wrap' })}>
              {!user?.twofa_enabled ? (
                <Button
                  variant="contained"
                  startIcon={twoFaLoading ? <CircularProgress size={18} color="inherit" /> : <ShieldIcon />}
                  onClick={openEnableDialog}
                  disabled={twoFaLoading}
                >
                  {t('profile.security.enableButton')}
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setTwoFaDialog('disable')}
                  >
                    {t('profile.security.disableButton')}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => setTwoFaDialog('regenerate')}
                  >
                    {t('profile.security.regenerateCodesButton')}
                  </Button>
                </>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Diálogo: activar 2FA (paso 1 - QR + código) */}
      <Dialog open={twoFaDialog === 'setup'} onClose={closeTwoFaDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{t('profile.security.setupTitle')}</DialogTitle>
        <Box component="form" onSubmit={handleConfirmSetup}>
          <DialogContent>
            {twoFaError && (
              <Alert severity="error" style={sx({ mb: 2 })}>
                {twoFaError}
              </Alert>
            )}
            <Typography variant="body2" style={sx({ mb: 2 })}>
              {t('profile.security.setupStep1')}
            </Typography>
            {setupData?.qrCodeDataUrl && (
              <Box style={sx({ textAlign: 'center', mb: 2 })}>
                <img
                  src={setupData.qrCodeDataUrl}
                  alt="QR"
                  style={{ width: 180, height: 180, imageRendering: 'pixelated' }}
                />
              </Box>
            )}
            <Typography variant="caption" color="textSecondary" style={sx([{ mb: 0.5 }, { display: 'block' }])}>
              {t('profile.security.setupManualEntry')}
            </Typography>
            <Typography
              variant="body2"
              style={sx({ fontFamily: 'monospace', wordBreak: 'break-all', mb: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 })}
            >
              {setupData?.secret}
            </Typography>
            <Typography variant="body2" style={sx({ mb: 2 })}>
              {t('profile.security.setupStep2')}
            </Typography>
            <TextField
              fullWidth
              autoFocus
              label={t('profile.security.codeLabel')}
              value={setupCode}
              onChange={(e) => setSetupCode(e.target.value)}
              slotProps={{ htmlInput: { maxLength: 6, autoComplete: 'one-time-code' } }}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeTwoFaDialog}>{t('profile.security.cancelButton')}</Button>
            <Button type="submit" variant="contained" disabled={twoFaLoading || setupCode.trim().length !== 6}>
              {twoFaLoading ? <CircularProgress size={20} /> : t('profile.security.confirmButton')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Diálogo: mostrar códigos de respaldo (tras confirmar setup o regenerar) */}
      <Dialog open={twoFaDialog === 'backupCodes'} maxWidth="xs" fullWidth>
        <DialogTitle>{t('profile.security.backupCodesTitle')}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" style={sx({ mb: 2 })}>
            {t('profile.security.backupCodesDescription')}
          </Typography>
          <Stack spacing={1} style={sx({ mb: 2 })}>
            {backupCodes?.map((code) => (
              <Chip key={code} label={code} style={sx({ fontFamily: 'monospace', justifyContent: 'flex-start' })} />
            ))}
          </Stack>
          <Button size="small" startIcon={<ContentCopyIcon />} onClick={handleCopyBackupCodes}>
            {t('common.copy')}
          </Button>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={handleFinishBackupCodes}>
            {t('profile.security.backupCodesConfirm')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo: desactivar 2FA (requiere contraseña) */}
      <Dialog open={twoFaDialog === 'disable'} onClose={closeTwoFaDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{t('profile.security.disableTitle')}</DialogTitle>
        <Box component="form" onSubmit={handleDisableTwoFactor}>
          <DialogContent>
            {twoFaError && (
              <Alert severity="error" style={sx({ mb: 2 })}>
                {twoFaError}
              </Alert>
            )}
            <Typography variant="body2" style={sx({ mb: 2 })}>
              {t('profile.security.disableDescription')}
            </Typography>
            <TextField
              fullWidth
              autoFocus
              type="password"
              label={t('profile.security.passwordLabel')}
              value={twoFaPassword}
              onChange={(e) => setTwoFaPassword(e.target.value)}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeTwoFaDialog}>{t('profile.security.cancelButton')}</Button>
            <Button type="submit" color="error" variant="contained" disabled={twoFaLoading || !twoFaPassword}>
              {twoFaLoading ? <CircularProgress size={20} /> : t('profile.security.disableButton')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* Diálogo: regenerar códigos de respaldo (requiere contraseña) */}
      <Dialog open={twoFaDialog === 'regenerate'} onClose={closeTwoFaDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{t('profile.security.regenerateTitle')}</DialogTitle>
        <Box component="form" onSubmit={handleRegenerateBackupCodes}>
          <DialogContent>
            {twoFaError && (
              <Alert severity="error" style={sx({ mb: 2 })}>
                {twoFaError}
              </Alert>
            )}
            <Typography variant="body2" style={sx({ mb: 2 })}>
              {t('profile.security.regenerateDescription')}
            </Typography>
            <TextField
              fullWidth
              autoFocus
              type="password"
              label={t('profile.security.passwordLabel')}
              value={twoFaPassword}
              onChange={(e) => setTwoFaPassword(e.target.value)}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={closeTwoFaDialog}>{t('profile.security.cancelButton')}</Button>
            <Button type="submit" variant="contained" disabled={twoFaLoading || !twoFaPassword}>
              {twoFaLoading ? <CircularProgress size={20} /> : t('profile.security.regenerateCodesButton')}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;