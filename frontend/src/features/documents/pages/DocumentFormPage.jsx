// FILE: frontend/src/features/documents/pages/DocumentFormPage.jsx
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
  MenuItem,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  LinearProgress,
  Card,
  CardContent,
  IconButton,
  Divider,
} from '@mui/material';
import { Save as SaveIcon, XCircle as CancelIcon, CloudUpload as UploadIcon, Trash2 as DeleteIcon, FileText as FileIcon } from 'lucide-react';
import documentsApi from '../api';
import studentsApi from '../../students/api';

const emptyForm = {
  student_id: '',
  document_type: 'OTHER',
  title: '',
  status: 'ACTIVE',
};

const DocumentFormPage = () => {
  const { t } = useTranslation();
  const [confirm, ConfirmDialog] = useConfirm();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  // Creating a document always requires a file: file_path and file_name are
  // NOT NULL in the schema, so there is no valid "metadata-only" create path.
  const isUpload = !isEdit;

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    loadOptions();
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

  const loadOptions = async () => {
    try {
      const studentsRes = await studentsApi.getAll({ pageSize: 1000 });
      setStudents(studentsRes?.data || []);
    } catch (err) {
      console.error('Error loading form options:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await documentsApi.getById(id);
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data }` envelope from the backend — read `.data`, not the envelope.
      const record = response?.data || response;
      setFormData({ ...emptyForm, ...record });
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (isEdit) {
        await documentsApi.update(id, formData);
      } else {
        setUploading(true);
        const formDataObj = new FormData();
        formDataObj.append('file', selectedFile);
        formDataObj.append('student_id', formData.student_id);
        formDataObj.append('document_type', formData.document_type);
        formDataObj.append('title', formData.title);
        formDataObj.append('status', formData.status);

        await documentsApi.upload(formDataObj, setUploadProgress);
      }
      navigate('/documents');
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (await confirm(t('documents.confirmDeleteDocument'))) {
      try {
        await documentsApi.delete(id);
        navigate('/documents');
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
        title={isEdit ? t('documents.edit') : t('documents.upload')}
        backTo="/documents"
      />

      {error && (
        <ErrorBanner message={error} onClose={() => setError(null)} />
      )}

      {uploading && (
        <Box style={sx({ mb: 2 })}>
          <Typography variant="body2" gutterBottom>
            {t('documents.uploading')} {uploadProgress}%
          </Typography>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      <form onSubmit={handleSubmit}>
        <FormSection title={t('documents.generalInfo')}><FormGrid gap="normal">
            <FormCol size={{ xs: 12 }}>
              <TextField
                fullWidth
                label={t('documents.title')}
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth required>
                <InputLabel>{t('documents.student')}</InputLabel>
                <Select name="student_id" value={formData.student_id || ''} onChange={handleChange} label={t('documents.student')} disabled={isEdit}>
                  {students.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>{t('documents.type')}</InputLabel>
                <Select
                  name="document_type"
                  value={formData.document_type}
                  onChange={handleChange}
                  label={t('documents.type')}
                >
                  <MenuItem value="IDENTIFICATION">{t('documents.identification')}</MenuItem>
                  <MenuItem value="TRANSCRIPT">{t('documents.transcript')}</MenuItem>
                  <MenuItem value="CERTIFICATE">{t('documents.certificate')}</MenuItem>
                  <MenuItem value="MEDICAL">{t('documents.medical')}</MenuItem>
                  <MenuItem value="CONSENT">{t('documents.consent')}</MenuItem>
                  <MenuItem value="OTHER">{t('documents.other')}</MenuItem>
                </Select>
              </FormControl>
            </FormCol>

            {isUpload && (
              <FormCol size={{ xs: 12 }}>
                <Card variant="outlined">
                  <CardContent>
                    {selectedFile ? (
                      <Box style={sx({ display: 'flex', alignItems: 'center', justifyContent: 'space-between' })}>
                        <Box style={sx({ display: 'flex', alignItems: 'center', gap: 1 })}>
                          <FileIcon color="primary" />
                          <Typography variant="body1">{selectedFile.name}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            ({(selectedFile.size / 1024).toFixed(1)} KB)
                          </Typography>
                        </Box>
                        <IconButton onClick={handleRemoveFile} color="error" size="small">
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    ) : (
                      <Button
                        variant="outlined"
                        component="label"
                        startIcon={<UploadIcon />}
                        fullWidth
                      >
                        {t('documents.selectFile')}
                        <input
                          type="file"
                          hidden
                          onChange={handleFileChange}
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                        />
                      </Button>
                    )}
                    <Typography variant="caption" color="textSecondary" style={sx([{ mt: 1 }, { display: 'block' }])}>
                      {t('documents.fileFormats')}
                    </Typography>
                  </CardContent>
                </Card>
              </FormCol>
            )}

            <FormCol size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>{t('documents.status')}</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label={t('documents.status')}
                >
                  <MenuItem value="ACTIVE">{t('status.active')}</MenuItem>
                  <MenuItem value="INACTIVE">{t('status.inactive')}</MenuItem>
                </Select>
              </FormControl>
            </FormCol>
          </FormGrid>
        </FormSection>

        <FormActions>
          <Button
            type="submit"
            variant="contained"
            startIcon={isUpload ? <UploadIcon /> : <SaveIcon />}
            disabled={submitting || uploading || (isUpload && !selectedFile)}
          >
            {submitting || uploading ? <CircularProgress size={24} /> :
              isUpload ? t('documents.upload') : t('common.save')}
          </Button>
          <Button
            variant="outlined"
            startIcon={<CancelIcon />}
            onClick={() => navigate('/documents')}
            disabled={submitting || uploading}
          >
            {t('common.cancel')}
          </Button>
        </FormActions>
      </form>
      {ConfirmDialog}
    </div>
  );
};

export default DocumentFormPage;
