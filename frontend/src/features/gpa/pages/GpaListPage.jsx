// FILE: frontend/src/features/gpa/pages/GpaListPage.jsx
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
import { Plus as AddIcon, Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon, RefreshCw as RefreshIcon, Calculator as CalculateIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import PermissionGate from '../../../components/PermissionGate';
import { usePermissions } from '../../../hooks/usePermissions';
import gpaApi from '../api';

const GpaListPage = () => {
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
    { field: 'code', label: t('gpa.code'), sortable: true },
    {
      field: 'student_id',
      label: t('gpa.student'),
      sortable: true,
      render: (value, row) => row.student_name || `Student ${value}`,
    },
    {
      field: 'gpa_value',
      label: t('gpa.value'),
      sortable: true,
      // gpa_value is a MySQL DECIMAL column; mysql2 returns decimals as
      // strings (e.g. "3.850"), which have no .toFixed(). Coerce with
      // Number() first, same fix already applied in StudentRecordPage.jsx.
      render: (value) => (value !== null && value !== undefined) ? Number(value).toFixed(3) : '-',
    },
    {
      field: 'cumulative_gpa',
      label: t('gpa.cumulative'),
      sortable: true,
      render: (value) => (value !== null && value !== undefined) ? Number(value).toFixed(3) : '-',
    },
    {
      field: 'credit_hours',
      label: t('gpa.credits'),
      sortable: true,
    },
    {
      field: 'status',
      label: t('gpa.status'),
      type: 'status',
      sortable: true,
    },
    {
      field: 'calculation_date',
      label: t('gpa.calculated'),
      type: 'datetime',
      sortable: true,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await gpaApi.getAll({
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
      console.error('Error loading GPA records:', error);
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
        await gpaApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const handleRecalculate = async (studentId) => {
    if (await confirm(t('gpa.confirmRecalculate'))) {
      try {
        await gpaApi.recalculate(studentId);
        loadData();
      } catch (error) {
        console.error('Error recalculating:', error);
      }
    }
  };

  const rowActions = [
    {
      label: t('common.view'),
      icon: <ViewIcon fontSize="small" />,
      onClick: (row) => navigate(`/gpa/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/gpa/${row.id}/edit`),
    },
    {
      label: t('gpa.recalculate'),
      icon: <CalculateIcon fontSize="small" />,
      onClick: (row) => handleRecalculate(row.student_id),
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
        <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('gpa.title')}</Typography>
        <PermissionGate permission="gpa.create">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/gpa/new')}
          >
            {t('gpa.add')}
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
        onRowClick={(row) => navigate(`/gpa/${row.id}`)}
        rowActions={rowActions}
        searchPlaceholder={t('gpa.search')}
        emptyMessage={t('gpa.noData')}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        filterValues={{ status: statusFilter }}
        filterFields={[
          {
            name: 'status',
            label: t('gpa.status'),
            options: [
              { value: 'PENDING', label: t('status.pending') },
              { value: 'APPROVED', label: t('status.approved') },
            ],
          },
        ]}
      />
    {ConfirmDialog}
    </Box>
  );
};

export default GpaListPage;