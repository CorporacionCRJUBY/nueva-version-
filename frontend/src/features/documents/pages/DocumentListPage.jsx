// FILE: frontend/src/features/documents/pages/DocumentListPage.jsx
import { sx } from '../../../ui/sx';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useConfirm from '../../../hooks/useConfirm';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import { Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon, Download as DownloadIcon, CloudUpload as UploadIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import PermissionGate from '../../../components/PermissionGate';
import { usePermissions } from '../../../hooks/usePermissions';
import documentsApi from '../api';
import DocumentPreviewDialog from '../components/DocumentPreviewDialog';

const DocumentListPage = () => {
  const { t } = useTranslation();
  const [confirm, ConfirmDialog] = useConfirm();
  const navigate = useNavigate();
  const { canCreate } = usePermissions();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('');
  const searchDebounceRef = useRef(null);
  // FIX (2026-09-17, previsualización de documentos): antes "Ver" (el ícono
  // de ojo) navegaba al MISMO formulario de metadatos que "Editar" — dos
  // botones distintos que hacían exactamente lo mismo, y ninguno mostraba
  // en realidad el contenido del archivo. Ahora "Ver" abre la previsualización.
  const [previewDoc, setPreviewDoc] = useState(null);

  const columns = [
    { field: 'code', label: t('documents.code'), sortable: true },
    { field: 'title', label: t('documents.documentTitle'), sortable: true },
    {
      field: 'student_id',
      label: t('documents.student'),
      sortable: true,
      render: (value, row) => row.student_name || `Student ${value}`,
    },
    {
      field: 'document_type',
      label: t('documents.type'),
      sortable: true,
    },
    {
      field: 'file_name',
      label: t('documents.fileName'),
      sortable: true,
    },
    {
      field: 'file_size',
      label: t('documents.size'),
      sortable: true,
      render: (value) => value ? `${(value / 1024).toFixed(1)} KB` : '-',
    },
    {
      field: 'upload_date',
      label: t('documents.uploadDate'),
      type: 'date',
      sortable: true,
    },
    {
      field: 'status',
      label: t('documents.status'),
      type: 'status',
      sortable: true,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await documentsApi.getAll({
        page: page + 1,
        pageSize,
        search: search || undefined,
        documentType: documentTypeFilter || undefined,
      });
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data, total, page, pageSize }` envelope from the backend.
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, documentTypeFilter]);

  const handleSearch = (value) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(0);
      setSearch(value);
    }, 400);
  };

  useEffect(() => () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  }, []);

  const handleFilterChange = (name, value) => {
    if (name === 'document_type') {
      setPage(0);
      setDocumentTypeFilter(value);
    }
  };

  const handleDelete = async (id) => {
    if (await confirm(t('common.confirmDelete'))) {
      try {
        await documentsApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const handleDownload = async (row) => {
    try {
      await documentsApi.download(row.id, row.file_name);
    } catch (error) {
      console.error('Error downloading:', error);
    }
  };

  const rowActions = [
    {
      label: t('documents.preview'),
      icon: <ViewIcon fontSize="small" />,
      onClick: (row) => setPreviewDoc(row),
    },
    {
      label: t('common.download'),
      icon: <DownloadIcon fontSize="small" />,
      onClick: (row) => handleDownload(row),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/documents/${row.id}/edit`),
    },
    {
      label: t('common.delete'),
      icon: <DeleteIcon fontSize="small" color="error" />,
      onClick: (row) => handleDelete(row.id),
    },
  ];

  return (
    <Box style={sx({ p: 3 })}>
      <Box style={sx({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' })}>
        <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('documents.title')}</Typography>
        <Box style={sx({ display: 'flex', gap: 2 })}>
          <PermissionGate permission="documents.create">
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => navigate('/documents/upload')}
            >
              {t('documents.upload')}
            </Button>
          </PermissionGate>
        </Box>
      </Box>

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRefresh={loadData}
        onRowClick={(row) => navigate(`/documents/${row.id}`)}
        rowActions={rowActions}
        searchPlaceholder={t('documents.search')}
        emptyMessage={t('documents.noData')}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        filterValues={{ document_type: documentTypeFilter }}
        filterFields={[
          {
            name: 'document_type',
            label: t('documents.type'),
            options: [
              { value: 'IDENTIFICATION', label: t('documents.identification') },
              { value: 'TRANSCRIPT', label: t('documents.transcript') },
              { value: 'CERTIFICATE', label: t('documents.certificate') },
              { value: 'MEDICAL', label: t('documents.medical') },
              { value: 'CONSENT', label: t('documents.consent') },
              { value: 'OTHER', label: t('documents.other') },
            ],
          },
        ]}
      />
    {ConfirmDialog}
    <DocumentPreviewDialog
      open={!!previewDoc}
      onClose={() => setPreviewDoc(null)}
      documentId={previewDoc?.id}
      mimeType={previewDoc?.mime_type}
      fileName={previewDoc?.file_name}
      title={previewDoc?.title}
    />
    </Box>
  );
};

export default DocumentListPage;