// FILE: frontend/src/features/grades/pages/GradeListPage.jsx
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
import { Plus as AddIcon, Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon, Lock as LockIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import PermissionGate from '../../../components/PermissionGate';
import { usePermissions } from '../../../hooks/usePermissions';
import gradesApi from '../api';

const GradeListPage = () => {
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
    { field: 'code', label: t('grades.code'), sortable: true },
    {
      field: 'student_id',
      label: t('grades.student'),
      sortable: true,
      render: (value, row) => row.student_name || `Student ${value}`,
    },
    {
      field: 'subject_id',
      label: t('grades.subject'),
      sortable: true,
      render: (value, row) => row.subject_name || `Subject ${value}`,
    },
    {
      field: 'grade_value',
      label: t('grades.value'),
      sortable: true,
    },
    {
      field: 'grade_letter',
      label: t('grades.letter'),
      sortable: true,
      render: (value) => value || '-',
    },
    {
      field: 'status',
      label: t('grades.status'),
      type: 'status',
      sortable: true,
    },
    {
      field: 'edit_deadline',
      label: t('grades.deadline'),
      type: 'datetime',
      sortable: true,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await gradesApi.getAll({
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
      console.error('Error loading grades:', error);
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
        await gradesApi.delete(id);
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
      onClick: (row) => navigate(`/grades/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/grades/${row.id}/edit`),
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
        <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('grades.title')}</Typography>
        <PermissionGate permission="grades.create">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/grades/new')}
          >
            {t('grades.add')}
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
        onRowClick={(row) => navigate(`/grades/${row.id}`)}
        rowActions={rowActions}
        searchPlaceholder={t('grades.search')}
        emptyMessage={t('grades.noData')}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        filterValues={{ status: statusFilter }}
        filterFields={[
          {
            name: 'status',
            label: t('grades.status'),
            options: [
              { value: 'DRAFT', label: t('status.draft') },
              { value: 'PUBLISHED', label: t('status.published') },
              { value: 'LOCKED', label: t('status.locked') },
              { value: 'UNLOCKED', label: t('status.unlocked') },
            ],
          },
        ]}
      />
    {ConfirmDialog}
    </Box>
  );
};

export default GradeListPage;