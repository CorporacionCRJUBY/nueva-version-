// FILE: frontend/src/features/documents/components/DocumentPreviewDialog.jsx
//
// FIX (2026-09-17, "que se pueda previsualizar los documentos que se
// suba"): antes de esto no existía ninguna forma de VER el contenido de un
// documento dentro de la app — "Ver" en la lista solo abría el formulario
// de metadatos (título, tipo, estado), y la única forma de comprobar qué
// archivo era en realidad era descargarlo. Este diálogo pide el archivo
// como blob autenticado (documentsApi.getPreviewBlobUrl) y lo muestra:
// - imagen (jpg/png/gif/webp) -> <img>
// - PDF -> <iframe> con el visor nativo del navegador
// - cualquier otro tipo (docx/xlsx/zip) -> aviso + botón de descarga,
//   porque el navegador no sabe renderizarlos inline.
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  IconButton,
} from '@mui/material';
import { Download as DownloadIcon, X as CloseIcon, AlertTriangle as WarningIcon } from 'lucide-react';
import documentsApi from '../api';

const EXTENSION_MIME = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

/**
 * Tipo MIME efectivo: el guardado en el registro si es fiable; si viene vacío,
 * genérico (octet-stream) o con un alias no estándar (image/jpg), se deduce de
 * la extensión del nombre de archivo. Sin esto, un PDF registrado con un MIME
 * genérico nunca se previsualizaba.
 */
export const resolveMimeType = (mimeType, fileName) => {
  const mime = (mimeType || '').toLowerCase().split(';')[0].trim();
  if (mime === 'image/jpg' || mime === 'image/pjpeg') return 'image/jpeg';
  if (mime && mime !== 'application/octet-stream') return mime;
  const ext = (fileName || '').split('.').pop().toLowerCase();
  return EXTENSION_MIME[ext] || mime;
};

const isPreviewableImage = (mimeType) => (mimeType || '').startsWith('image/');
const isPreviewablePdf = (mimeType) => mimeType === 'application/pdf';

const DocumentPreviewDialog = ({ open, onClose, documentId, mimeType, fileName, title }) => {
  const { t } = useTranslation();
  const effectiveMime = resolveMimeType(mimeType, fileName);
  const previewable = isPreviewableImage(effectiveMime) || isPreviewablePdf(effectiveMime);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let currentUrl = null;

    setBlobUrl(null);
    setError(null);

    // Los tipos que el navegador no sabe mostrar (docx, xlsx, zip...) no se
    // piden al servidor: se muestra el aviso y el botón de descarga al instante.
    if (!open || !documentId || !previewable) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    documentsApi
      .getPreviewBlobUrl(documentId, effectiveMime)
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        currentUrl = url;
        setBlobUrl(url);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Libera el object URL al cerrar/cambiar de documento — si no, cada
    // previsualización se queda en memoria hasta recargar la página.
    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [open, documentId, previewable, effectiveMime]);

  const handleDownload = () => {
    documentsApi.download(documentId, fileName);
  };

  const canRenderImage = blobUrl && isPreviewableImage(effectiveMime);
  const canRenderPdf = blobUrl && isPreviewablePdf(effectiveMime);
  const cannotPreview = !!documentId && !previewable;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
      >
        <Typography variant="h6" noWrap sx={{ minWidth: 0 }}>
          {title || fileName || t('documents.preview')}
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label={t('common.close')}>
          <CloseIcon size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          minHeight: 420,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
          p: canRenderImage || canRenderPdf ? 0 : 3,
        }}
      >
        {loading && <CircularProgress />}

        {!loading && error && (
          <Box sx={{ textAlign: 'center' }}>
            <WarningIcon size={36} />
            <Typography color="error" sx={{ mt: 1 }}>
              {error}
            </Typography>
          </Box>
        )}

        {!loading && !error && canRenderImage && (
          <img
            src={blobUrl}
            alt={fileName || 'document'}
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
          />
        )}

        {!loading && !error && canRenderPdf && (
          <iframe
            src={blobUrl}
            title={fileName || 'document'}
            style={{ width: '100%', height: '70vh', border: 'none' }}
          />
        )}

        {open && !loading && !error && cannotPreview && (
          <Box sx={{ textAlign: 'center' }}>
            <Typography color="text.secondary">{t('documents.previewNotSupported')}</Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
        <Button variant="contained" startIcon={<DownloadIcon size={16} />} onClick={handleDownload} disabled={!documentId}>
          {t('common.download')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentPreviewDialog;
