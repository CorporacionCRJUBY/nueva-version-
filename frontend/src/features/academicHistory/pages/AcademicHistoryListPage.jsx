// FILE: frontend/src/features/academicHistory/pages/AcademicHistoryListPage.jsx
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
import { Plus as AddIcon, Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import PermissionGate from '../../../components/PermissionGate';
import { usePermissions } from '../../../hooks/usePermissions';
import academicHistoryApi from '../api';

const AcademicHistoryListPage = () => {
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
    { field: 'code', label: t('academicHistory.code'), sortable: true },
    {
      field: 'student_id',
      label: t('academicHistory.student'),
      sortable: true,
      render: (value, row) => row.student_name || `Student ${value}`,
    },
    {
      field: 'subject_id',
      label: t('academicHistory.subject'),
      sortable: true,
      render: (value, row) => row.subject_name || `Subject ${value}`,
    },
    {
      field: 'grade_value',
      label: t('academicHistory.grade'),
      sortable: true,
      render: (value) => value !== null && value !== undefined ? value : '-',
    },
    {
      field: 'grade_letter',
      label: t('academicHistory.letter'),
      sortable: true,
      render: (value) => value || '-',
    },
    {
      field: 'status',
      label: t('academicHistory.status'),
      type: 'status',
      sortable: true,
    },
    {
      field: 'academic_period_id',
      label: t('academicHistory.period'),
      sortable: true,
      render: (value, row) => row.period_name || `Period ${value}`,
    },
    {
      field: 'created_at',
      label: t('academicHistory.date'),
      type: 'datetime',
      sortable: true,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await academicHistoryApi.getAll({
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
      console.error('Error loading academic history:', error);
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
        await academicHistoryApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const rowActions = [
    {
      label: t('common.view'),
      icon: <ViewIcon fontSize="small" />,
      onClick: (row) => navigate(`/academic-history/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/academic-history/${row.id}/edit`),
      show: (row) => row.status !== 'LOCKED',
    },
    {
      label: t('common.delete'),
      icon: <DeleteIcon fontSize="small" color="error" />,
      onClick: (row) => handleDelete(row.id),
      show: (row) => row.status !== 'LOCKED',
    },
  ];

  return (
    <Box style={sx({ p: 3 })}>
      <Box style={sx({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' })}>
        <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('academicHistory.title')}</Typography>
        <PermissionGate permission="academic-history.create">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/academic-history/new')}
          >
            {t('academicHistory.add')}
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
        onRowClick={(row) => navigate(`/academic-history/${row.id}`)}
        rowActions={rowActions}
        searchPlaceholder={t('academicHistory.search')}
        emptyMessage={t('academicHistory.noData')}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        filterValues={{ status: statusFilter }}
        filterFields={[
          {
            name: 'status',
            label: t('academicHistory.status'),
            options: [
              { value: 'DRAFT', label: t('status.draft') },
              { value: 'PUBLISHED', label: t('status.published') },
              { value: 'LOCKED', label: t('status.locked') },
            ],
          },
        ]}
      />
    {ConfirmDialog}
    </Box>
  );
};

export default AcademicHistoryListPage;