// FILE: frontend/src/features/documents/pages/DocumentFormPage.jsx
import { sx } from '../../../ui/sx';
import { FormSection, FormGrid, FormCol, FormActions, PageHeader, ErrorBanner, FormLoading } from '../../../components/FormKit';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useConfirm from '../../../hooks/useConfirm';
import { usePermissions } from '../../../hooks/usePermissions';
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
import { Save as SaveIcon, XCircle as CancelIcon, CloudUpload as UploadIcon, Trash2 as DeleteIcon, FileText as FileIcon, Eye as PreviewIcon, Download as DownloadIcon } from 'lucide-react';
import documentsApi from '../api';
import AsyncSelect from '../../../components/AsyncSelect';
import studentsApi from '../../students/api';
import DocumentPreviewDialog from '../components/DocumentPreviewDialog';

const emptyForm = {
  student_id: '',
  document_type: 'OTHER',
  title: '',
  status: 'ACTIVE',
};

const DocumentFormPage = () => {
  const { t } = useTranslation();
  const [confirm, ConfirmDialog] = useConfirm();
  const { canDelete: canDeletePermission } = usePermissions();
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
  const [formData, setFormData] = useState(emptyForm);
  // FIX (2026-09-17): al editar un documento no se mostraba NINGÚN dato del
  // archivo real (nombre, tamaño, tipo) ni forma de verlo — solo los campos
  // de metadatos. Se guarda aparte para pintar la tarjeta "Archivo actual"
  // con Previsualizar/Descargar.
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    // FIX (2026-09-17, "arreglar la función de subir archivos"): esto
    // llamaba a loadOptions(), una función que YA NO EXISTE en este
    // archivo — era del catálogo de estudiantes que este formulario traía
    // completo antes de que el campo se convirtiera en AsyncSelect (busca
    // contra el servidor por sí solo, ver más abajo). Esa función faltante
    // lanzaba un ReferenceError apenas se montaba la pantalla, así que TODO
    // el formulario de subir/editar documentos quedaba roto de entrada,
    // sin llegar siquiera a mostrar el selector de archivo.
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

  // FIX (bitácora 2026-09-15, pendiente "pageSize=1000 en los selectores"):
  // el catálogo de estudiantes es el que más crece con el uso normal del
  // colegio, así que este campo ahora busca contra el servidor en vez de
  // traer hasta 1000 filas cada vez que se abre el formulario.
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

  const handleSelectChange = (name) => (selectedId) => {
    setFormData((prev) => ({ ...prev, [name]: selectedId }));
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
                label={t('documents.documentTitle')}
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </FormCol>
            <FormCol size={{ xs: 12, md: 6 }}>
              <AsyncSelect
                api={studentsApi}
                label={t('documents.student')}
                required
                disabled={isEdit}
                value={formData.student_id || null}
                onChange={handleSelectChange('student_id')}
                getOptionLabel={(s) => `${s.first_name} ${s.last_name}`}
              />
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

            {isEdit && (
              <FormCol size={{ xs: 12 }}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      {t('documents.currentFile')}
                    </Typography>
                    {formData.file_name ? (
                      <Box style={sx({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 })}>
                        <Box style={sx({ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 })}>
                          <FileIcon color="primary" />
                          <Box style={sx({ minWidth: 0 })}>
                            <Typography variant="body1" noWrap>{formData.file_name}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              {formData.file_size ? `${(formData.file_size / 1024).toFixed(1)} KB` : ''}
                              {formData.mime_type ? ` · ${formData.mime_type}` : ''}
                            </Typography>
                          </Box>
                        </Box>
                        <Box style={sx({ display: 'flex', gap: 1, flexShrink: 0 })}>
                          <Button size="small" variant="outlined" startIcon={<PreviewIcon size={16} />} onClick={() => setPreviewOpen(true)}>
                            {t('documents.preview')}
                          </Button>
                          <Button size="small" variant="outlined" startIcon={<DownloadIcon size={16} />} onClick={() => documentsApi.download(id, formData.file_name)}>
                            {t('common.download')}
                          </Button>
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="textSecondary">{t('documents.noFile')}</Typography>
                    )}
                  </CardContent>
                </Card>
              </FormCol>
            )}

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
          {/* FIX (2026-09-17): handleDelete ya existía pero ningún botón lo
              llamaba — al editar un documento no había forma de borrarlo
              desde esta pantalla, solo desde la lista general. */}
          {isEdit && canDeletePermission('documents') && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon size={16} />}
              onClick={handleDelete}
              disabled={submitting || uploading}
              style={sx({ marginLeft: 'auto' })}
            >
              {t('common.delete')}
            </Button>
          )}
        </FormActions>
      </form>
      {ConfirmDialog}
      <DocumentPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        documentId={id}
        mimeType={formData.mime_type}
        fileName={formData.file_name}
        title={formData.title}
      />
    </div>
  );
};

export default DocumentFormPage;
