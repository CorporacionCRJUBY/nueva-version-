// FILE: frontend/src/features/reports/pages/ReportFormPage.jsx
import { sx } from '../../../ui/sx';
import { FormSection, FormGrid, FormCol, PageHeader, ErrorBanner, FormLoading } from '../../../components/FormKit';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Chip,
  Divider,
  Button,
} from '@mui/material';
import {  } from 'lucide-react';
import reportsApi from '../api';

const ReportFormPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await reportsApi.getById(id);
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data }` envelope from the backend — read `.data`, not the envelope.
      setData(response?.data || response);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <FormLoading sections={2} fieldsPerSection={6} />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ErrorBanner message={error} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Alert severity="warning">{t('reports.notFound')}</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports.details')}
        backTo="/reports"
      />

      <FormSection>
        <FormGrid gap="normal">
          <FormCol size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" color="textSecondary">
              {t('reports.code')}
            </Typography>
            <Typography variant="body1">{data.code}</Typography>
          </FormCol>
          <FormCol size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" color="textSecondary">
              {t('reports.category')}
            </Typography>
            <Chip label={data.category} color="primary" size="small" />
          </FormCol>
          <FormCol size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" color="textSecondary">
              {t('reports.student')}
            </Typography>
            <Typography variant="body1">{data.student_name || data.student_id}</Typography>
          </FormCol>
          <FormCol size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" color="textSecondary">
              {t('reports.status')}
            </Typography>
            <Chip label={data.status} color={data.status === 'OFFICIAL' ? 'success' : 'default'} size="small" />
          </FormCol>
          <FormCol size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" color="textSecondary">
              {t('reports.version')}
            </Typography>
            <Typography variant="body1">v{data.version_number}</Typography>
          </FormCol>
          <FormCol size={{ xs: 12, md: 6 }}>
            <Typography variant="subtitle2" color="textSecondary">
              {t('reports.date')}
            </Typography>
            <Typography variant="body1">
              {data.report_date ? new Date(data.report_date).toLocaleDateString() : '-'}
            </Typography>
          </FormCol>
          <FormCol size={{ xs: 12 }}>
            <Divider style={sx({ my: 1 })} />
            <Typography variant="subtitle2" color="textSecondary">
              {t('reports.notes')}
            </Typography>
            <Typography variant="body1">{data.notes || '-'}</Typography>
          </FormCol>
          {data.has_pdf && (
            <FormCol size={{ xs: 12 }}>
              <Button
                variant="outlined"
                startIcon={<PdfIcon />}
                onClick={async () => {
                  // pdf_url ya no existe como URL pública (ver backend/src/app.js);
                  // se pide el PDF con el token y se abre el blob resultante.
                  try {
                    const blobUrl = await reportsApi.getPreviewBlobUrl(id);
                    window.open(blobUrl, '_blank');
                  } catch (err) {
                    console.error('[Reports] preview failed', err);
                  }
                }}
              >
                {t('reports.viewPdf')}
              </Button>
            </FormCol>
          )}
        </FormGrid>
      </FormSection>
    </div>
  );
};

export default ReportFormPage;