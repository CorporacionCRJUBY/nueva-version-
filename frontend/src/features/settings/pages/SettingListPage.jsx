// FILE: frontend/src/features/settings/pages/SettingListPage.jsx
import { sx } from '../../../ui/sx';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  MenuItem,
} from '@mui/material';
import { Save as SaveIcon } from 'lucide-react';
import PermissionGate from '../../../components/PermissionGate';
import settingsApi from '../api';

// Bug fix: this form's field names (school_email, theme, academic_year_start/
// end, grading_scale, attendance_threshold, notification_enabled,
// email_notifications) never matched any key actually seeded into
// system_settings or read by the app (13_system_settings.seed.js, Plan
// §81-95). Editing and saving looked like it worked, but every field
// mapped to a setting nothing else in the system ever consulted, while
// real settings the app depends on (gpa_scale, min_gpa_to_graduate,
// required_credits_to_graduate, etc.) had no field here at all. Rebuilt to
// mirror the real keys.
const emptySettings = {
  school_name: '',
  school_address: '',
  school_phone: '',
  school_motto: '',
  school_code: '',
  default_academic_year: '',
  default_language: 'en',
  date_format: 'MM/DD/YYYY',
  time_format: '12h',
  time_zone: 'America/New_York',
  gpa_scale: '4.0',
  min_gpa_to_graduate: '2.0',
  required_credits_to_graduate: '24',
  grade_edit_window_hours: '24',
  attendance_edit_requires_permission: false,
  report_default_paper_size: 'Letter',
  report_monthly_attendance_orientation: 'Landscape',
  max_upload_size_mb: '10',
  allowed_document_extensions: 'pdf,jpg,jpeg,png',
};

const SettingListPage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState(emptySettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await settingsApi.get();
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data }` envelope from the backend — read `.data`, not the envelope.
      const record = response?.data || response || {};
      setSettings((prev) => ({
        ...prev,
        ...record,
        // Stored as the text 'true'/'false' in system_settings; render as a real boolean.
        attendance_edit_requires_permission: record.attendance_edit_requires_permission === 'true' || record.attendance_edit_requires_permission === true,
      }));
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await settingsApi.update(settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box style={sx({ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' })}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <PermissionGate permission="settings.view">
      <Box style={sx({ p: 3 })}>
        <Typography variant="h4" className="gradient-text" gutterBottom style={sx({ fontWeight: 800 })}>
          {t('settings.title')}
        </Typography>

        <Alert severity="info" style={sx({ mb: 2 })}>
          {t('settings.globalSettingsHint')}
        </Alert>

        {error && (
          <Alert severity="error" style={sx({ mb: 2 })}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" style={sx({ mb: 2 })}>
            {t('settings.saveSuccess')}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* School Information */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('settings.schoolInfo')}
                  </Typography>
                  <Divider style={sx({ mb: 2 })} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label={t('settings.schoolName')}
                        name="school_name"
                        value={settings.school_name}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label={t('settings.schoolCode')}
                        name="school_code"
                        value={settings.school_code}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid size={{ xs: 12 }}>
                      <TextField
                        fullWidth
                        label={t('settings.schoolAddress')}
                        name="school_address"
                        value={settings.school_address}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label={t('settings.schoolPhone')}
                        name="school_phone"
                        value={settings.school_phone}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label={t('settings.schoolMotto')}
                        name="school_motto"
                        value={settings.school_motto}
                        onChange={handleChange}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Academic Year / Language / Format */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('settings.academicRegional')}
                  </Typography>
                  <Divider style={sx({ mb: 2 })} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label={t('settings.defaultAcademicYear')}
                        name="default_academic_year"
                        value={settings.default_academic_year}
                        onChange={handleChange}
                        placeholder="2026-2027"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        select
                        label={t('settings.defaultLanguage')}
                        name="default_language"
                        value={settings.default_language}
                        onChange={handleChange}
                      >
                        <MenuItem value="en">{t('settings.english')}</MenuItem>
                        <MenuItem value="es">{t('settings.spanish')}</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        select
                        label={t('settings.dateFormat')}
                        name="date_format"
                        value={settings.date_format}
                        onChange={handleChange}
                      >
                        <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                        <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                        <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        select
                        label={t('settings.timeFormat')}
                        name="time_format"
                        value={settings.time_format}
                        onChange={handleChange}
                      >
                        <MenuItem value="12h">12h</MenuItem>
                        <MenuItem value="24h">24h</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        select
                        label={t('settings.timeZone')}
                        name="time_zone"
                        value={settings.time_zone}
                        onChange={handleChange}
                      >
                        <MenuItem value="America/New_York">America/New_York</MenuItem>
                        <MenuItem value="America/Chicago">America/Chicago</MenuItem>
                        <MenuItem value="America/Denver">America/Denver</MenuItem>
                        <MenuItem value="America/Los_Angeles">America/Los_Angeles</MenuItem>
                        <MenuItem value="Europe/London">Europe/London</MenuItem>
                        <MenuItem value="Europe/Madrid">Europe/Madrid</MenuItem>
                        <MenuItem value="Asia/Dubai">Asia/Dubai</MenuItem>
                      </TextField>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* GPA Scale / Credit Rules */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('settings.gpaCredits')}
                  </Typography>
                  <Divider style={sx({ mb: 2 })} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label={t('settings.gpaScale')}
                        name="gpa_scale"
                        type="number"
                        slotProps={{ htmlInput: { step: '0.1', min: 0 } }}
                        value={settings.gpa_scale}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label={t('settings.minGpaToGraduate')}
                        name="min_gpa_to_graduate"
                        type="number"
                        slotProps={{ htmlInput: { step: '0.1', min: 0 } }}
                        value={settings.min_gpa_to_graduate}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label={t('settings.requiredCreditsToGraduate')}
                        name="required_credits_to_graduate"
                        type="number"
                        slotProps={{ htmlInput: { step: '1', min: 0 } }}
                        value={settings.required_credits_to_graduate}
                        onChange={handleChange}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Attendance & Grade Rules */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('settings.attendanceGrades')}
                  </Typography>
                  <Divider style={sx({ mb: 2 })} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label={t('settings.gradeEditWindowHours')}
                        name="grade_edit_window_hours"
                        type="number"
                        slotProps={{ htmlInput: { step: '1', min: 0 } }}
                        value={settings.grade_edit_window_hours}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            name="attendance_edit_requires_permission"
                            checked={settings.attendance_edit_requires_permission}
                            onChange={handleChange}
                          />
                        }
                        label={t('settings.attendanceEditRequiresPermission')}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Report Settings */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('settings.reports')}
                  </Typography>
                  <Divider style={sx({ mb: 2 })} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        select
                        label={t('settings.reportDefaultPaperSize')}
                        name="report_default_paper_size"
                        value={settings.report_default_paper_size}
                        onChange={handleChange}
                      >
                        <MenuItem value="Letter">Letter</MenuItem>
                        <MenuItem value="Legal">Legal</MenuItem>
                        <MenuItem value="A4">A4</MenuItem>
                      </TextField>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        select
                        label={t('settings.reportMonthlyAttendanceOrientation')}
                        name="report_monthly_attendance_orientation"
                        value={settings.report_monthly_attendance_orientation}
                        onChange={handleChange}
                      >
                        <MenuItem value="Portrait">{t('settings.portrait')}</MenuItem>
                        <MenuItem value="Landscape">{t('settings.landscape')}</MenuItem>
                      </TextField>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* File Settings */}
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {t('settings.files')}
                  </Typography>
                  <Divider style={sx({ mb: 2 })} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label={t('settings.maxUploadSizeMb')}
                        name="max_upload_size_mb"
                        type="number"
                        slotProps={{ htmlInput: { step: '1', min: 1 } }}
                        value={settings.max_upload_size_mb}
                        onChange={handleChange}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label={t('settings.allowedDocumentExtensions')}
                        name="allowed_document_extensions"
                        value={settings.allowed_document_extensions}
                        onChange={handleChange}
                        helperText={t('settings.allowedDocumentExtensionsHint')}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Buttons */}
            <Grid size={{ xs: 12 }}>
              <Box style={sx({ display: 'flex', gap: 2 })}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={submitting}
                >
                  {submitting ? <CircularProgress size={24} /> : t('common.save')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Box>
    </PermissionGate>
  );
};

export default SettingListPage;
