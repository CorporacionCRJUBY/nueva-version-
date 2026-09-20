// FILE: frontend/src/features/gransif/pages/GransifListPage.jsx
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
import { Plus as AddIcon, Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon, Play as ActivateIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import PermissionGate from '../../../components/PermissionGate';
import { usePermissions } from '../../../hooks/usePermissions';
import gransifApi from '../api';

const GransifListPage = () => {
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
  const [statusFilter, setStatusFilter] = useState('');
  const searchDebounceRef = useRef(null);

  const columns = [
    { field: 'code', label: t('gransif.code'), sortable: true },
    {
      field: 'student_id',
      label: t('gransif.student'),
      sortable: true,
      render: (value, row) => row.student_name || `Student ${value}`,
    },
    {
      field: 'assessment_date',
      label: t('gransif.date'),
      type: 'date',
      sortable: true,
    },
    {
      field: 'score',
      label: t('gransif.score'),
      sortable: true,
      render: (value) => value !== null ? value : '-',
    },
    {
      field: 'status',
      label: t('gransif.status'),
      type: 'status',
      sortable: true,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await gransifApi.getAll({
        page: page + 1,
        pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data, total, page, pageSize }` envelope from the backend.
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading gransif records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, statusFilter]);

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
    if (name === 'status') {
      setPage(0);
      setStatusFilter(value);
    }
  };

  const handleDelete = async (id) => {
    if (await confirm(t('common.confirmDelete'))) {
      try {
        await gransifApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const handleActivate = async (id) => {
    if (await confirm(t('gransif.confirmActivate'))) {
      try {
        await gransifApi.activate(id);
        loadData();
      } catch (error) {
        console.error('Error activating:', error);
      }
    }
  };

  const rowActions = [
    {
      label: t('common.view'),
      icon: <ViewIcon fontSize="small" />,
      onClick: (row) => navigate(`/gransif/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/gransif/${row.id}/edit`),
    },
    {
      label: t('gransif.activate'),
      icon: <ActivateIcon fontSize="small" color="success" />,
      onClick: (row) => handleActivate(row.id),
      show: (row) => row.status === 'PENDING',
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
        <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('gransif.title')}</Typography>
        <PermissionGate permission="gransif.create">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/gransif/new')}
          >
            {t('gransif.add')}
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
        onRowClick={(row) => navigate(`/gransif/${row.id}`)}
        rowActions={rowActions}
        searchPlaceholder={t('gransif.search')}
        emptyMessage={t('gransif.noData')}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        filterValues={{ status: statusFilter }}
        filterFields={[
          {
            name: 'status',
            label: t('gransif.status'),
            options: [
              { value: 'PENDING', label: t('status.pending') },
              { value: 'ACTIVE', label: t('status.active') },
              { value: 'COMPLETED', label: t('status.completed') },
            ],
          },
        ]}
      />
    {ConfirmDialog}
    </Box>
  );
};

export default GransifListPage;