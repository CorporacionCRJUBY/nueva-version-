// FILE: frontend/src/features/credits/pages/CreditListPage.jsx
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
import { Plus as AddIcon, Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon, RefreshCw as RefreshIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import PermissionGate from '../../../components/PermissionGate';
import { usePermissions } from '../../../hooks/usePermissions';
import creditsApi from '../api';

const CreditListPage = () => {
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
  const [creditTypeFilter, setCreditTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const searchDebounceRef = useRef(null);

  const columns = [
    { field: 'code', label: t('credits.code'), sortable: true },
    {
      field: 'student_id',
      label: t('credits.student'),
      sortable: true,
      render: (value, row) => row.student_name || `Student ${value}`,
    },
    {
      field: 'credit_type',
      label: t('credits.type'),
      sortable: true,
    },
    {
      field: 'credits_earned',
      label: t('credits.earned'),
      sortable: true,
    },
    {
      field: 'credits_required',
      label: t('credits.required'),
      sortable: true,
    },
    {
      field: 'status',
      label: t('credits.status'),
      type: 'status',
      sortable: true,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await creditsApi.getAll({
        page: page + 1,
        pageSize,
        search: search || undefined,
        creditType: creditTypeFilter || undefined,
        status: statusFilter || undefined,
      });
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data, total, page, pageSize }` envelope from the backend.
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading credits:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, creditTypeFilter, statusFilter]);

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
    setPage(0);
    if (name === 'credit_type') setCreditTypeFilter(value);
    if (name === 'status') setStatusFilter(value);
  };

  const handleDelete = async (id) => {
    if (await confirm(t('common.confirmDelete'))) {
      try {
        await creditsApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const handleRecalculate = async (studentId) => {
    if (await confirm(t('credits.confirmRecalculate'))) {
      try {
        await creditsApi.recalculate(studentId);
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
      onClick: (row) => navigate(`/credits/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/credits/${row.id}/edit`),
    },
    {
      label: t('credits.recalculate'),
      icon: <RefreshIcon fontSize="small" />,
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
        <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('credits.title')}</Typography>
        <PermissionGate permission="credits.create">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/credits/new')}
          >
            {t('credits.add')}
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
        onRowClick={(row) => navigate(`/credits/${row.id}`)}
        rowActions={rowActions}
        searchPlaceholder={t('credits.search')}
        emptyMessage={t('credits.noData')}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        filterValues={{ credit_type: creditTypeFilter, status: statusFilter }}
        filterFields={[
          {
            name: 'credit_type',
            label: t('credits.type'),
            options: [
              { value: 'ACADEMIC', label: t('credits.academic') },
              { value: 'SOCIAL', label: t('credits.social') },
              { value: 'COMMUNITY', label: t('credits.community') },
              { value: 'ELECTIVE', label: t('credits.elective') },
            ],
          },
          {
            name: 'status',
            label: t('credits.status'),
            options: [
              { value: 'PENDING', label: t('status.pending') },
              { value: 'APPROVED', label: t('status.approved') },
              { value: 'REJECTED', label: t('status.rejected') },
            ],
          },
        ]}
      />
    {ConfirmDialog}
    </Box>
  );
};

export default CreditListPage;