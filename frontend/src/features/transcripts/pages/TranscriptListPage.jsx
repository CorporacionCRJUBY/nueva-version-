// FILE: frontend/src/features/transcripts/pages/TranscriptListPage.jsx
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
import { Plus as AddIcon, Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon, FileText as PdfIcon, Play as GenerateIcon, Circle as ReprintIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import PermissionGate from '../../../components/PermissionGate';
import { usePermissions } from '../../../hooks/usePermissions';
import transcriptsApi from '../api';

const TranscriptListPage = () => {
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
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const searchDebounceRef = useRef(null);

  const columns = [
    { field: 'code', label: t('transcripts.code'), sortable: true },
    {
      field: 'student_id',
      label: t('transcripts.student'),
      sortable: true,
      render: (value, row) => row.student_name || `Student ${value}`,
    },
    {
      field: 'transcript_type',
      label: t('transcripts.type'),
      sortable: true,
    },
    {
      field: 'status',
      label: t('transcripts.status'),
      type: 'status',
      sortable: true,
    },
    {
      field: 'version_number',
      label: t('transcripts.version'),
      sortable: true,
    },
    {
      field: 'created_at',
      label: t('transcripts.created'),
      type: 'datetime',
      sortable: true,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await transcriptsApi.getAll({
        page: page + 1,
        pageSize,
        search: search || undefined,
        transcriptType: typeFilter || undefined,
        status: statusFilter || undefined,
      });
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data, total, page, pageSize }` envelope from the backend.
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading transcripts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, typeFilter, statusFilter]);

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
    if (name === 'transcript_type') {
      setPage(0);
      setTypeFilter(value);
    }
    if (name === 'status') {
      setPage(0);
      setStatusFilter(value);
    }
  };

  const handleDelete = async (id) => {
    if (await confirm(t('common.confirmDelete'))) {
      try {
        await transcriptsApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const handleGenerate = async (id) => {
    try {
      await transcriptsApi.generate(id);
      loadData();
    } catch (error) {
      console.error('Error generating transcript:', error);
    }
  };

  const handlePreview = async (id) => {
    try {
      await transcriptsApi.preview(id);
    } catch (error) {
      console.error('Error previewing transcript:', error);
    }
  };

  const handleReprint = async (id) => {
    if (await confirm(t('transcripts.confirmReprint'))) {
      try {
        await transcriptsApi.reprint(id);
        loadData();
      } catch (error) {
        console.error('Error reprinting transcript:', error);
      }
    }
  };

  const rowActions = [
    {
      label: t('common.view'),
      icon: <ViewIcon fontSize="small" />,
      onClick: (row) => navigate(`/transcripts/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/transcripts/${row.id}/edit`),
      show: (row) => row.status === 'DRAFT',
    },
    {
      label: t('transcripts.generate'),
      icon: <GenerateIcon fontSize="small" color="primary" />,
      onClick: (row) => handleGenerate(row.id),
      show: (row) => row.status !== 'OFFICIAL' && row.status !== 'REPRINTED',
    },
    {
      label: t('transcripts.preview'),
      icon: <PdfIcon fontSize="small" color="error" />,
      onClick: (row) => handlePreview(row.id),
      show: (row) => row.status === 'OFFICIAL' || row.status === 'REPRINTED',
    },
    {
      label: t('transcripts.reprint'),
      icon: <ReprintIcon fontSize="small" color="warning" />,
      onClick: (row) => handleReprint(row.id),
      show: (row) => row.status === 'OFFICIAL',
    },
    {
      label: t('common.delete'),
      icon: <DeleteIcon fontSize="small" color="error" />,
      onClick: (row) => handleDelete(row.id),
      show: (row) => row.status === 'DRAFT',
    },
  ];

  return (
    <Box style={sx({ p: 3 })}>
      <Box style={sx({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' })}>
        <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('transcripts.title')}</Typography>
        <PermissionGate permission="transcripts.create">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/transcripts/new')}
          >
            {t('transcripts.add')}
          </Button>
        </PermissionGate>
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
        onRowClick={(row) => navigate(`/transcripts/${row.id}`)}
        rowActions={rowActions}
        searchPlaceholder={t('transcripts.search')}
        emptyMessage={t('transcripts.noData')}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        filterValues={{ transcript_type: typeFilter, status: statusFilter }}
        filterFields={[
          {
            name: 'transcript_type',
            label: t('transcripts.type'),
            options: [
              { value: 'OFFICIAL', label: t('transcripts.official') },
              { value: 'UNOFFICIAL', label: t('transcripts.unofficial') },
            ],
          },
          {
            name: 'status',
            label: t('transcripts.status'),
            options: [
              { value: 'DRAFT', label: t('status.draft') },
              { value: 'OFFICIAL', label: t('status.official') },
              { value: 'ARCHIVED', label: t('status.archived') },
              { value: 'REPRINTED', label: t('status.reprinted') },
            ],
          },
        ]}
      />
    {ConfirmDialog}
    </Box>
  );
};

export default TranscriptListPage;
