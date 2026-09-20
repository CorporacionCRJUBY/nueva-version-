// FILE: frontend/src/features/graduation/pages/GraduationListPage.jsx
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
import { Plus as AddIcon, Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon, CheckCircle2 as ValidateIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import PermissionGate from '../../../components/PermissionGate';
import { usePermissions } from '../../../hooks/usePermissions';
import graduationApi from '../api';

const GraduationListPage = () => {
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
    { field: 'code', label: t('graduation.code'), sortable: true },
    {
      field: 'student_id',
      label: t('graduation.student'),
      sortable: true,
      render: (value, row) => row.student_name || `Student ${value}`,
    },
    {
      field: 'graduation_date',
      label: t('graduation.date'),
      type: 'date',
      sortable: true,
    },
    {
      field: 'status',
      label: t('graduation.status'),
      type: 'status',
      sortable: true,
    },
    {
      field: 'requirements_met',
      label: t('graduation.requirementsMet'),
      sortable: true,
      render: (value) => value ? 
        <Chip label={t('common.yes')} color="success" size="small" /> : 
        <Chip label={t('common.no')} color="error" size="small" />,
    },
    {
      field: 'certificate_number',
      label: t('graduation.certificate'),
      sortable: true,
      render: (value) => value || '-',
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await graduationApi.getAll({
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
      console.error('Error loading graduation records:', error);
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
        await graduationApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const handleValidate = async (studentId) => {
    if (await confirm(t('graduation.confirmValidate'))) {
      try {
        await graduationApi.validate(studentId);
        loadData();
      } catch (error) {
        console.error('Error validating:', error);
      }
    }
  };

  const rowActions = [
    {
      label: t('common.view'),
      icon: <ViewIcon fontSize="small" />,
      onClick: (row) => navigate(`/graduation/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/graduation/${row.id}/edit`),
    },
    {
      label: t('graduation.validate'),
      icon: <ValidateIcon fontSize="small" color="success" />,
      onClick: (row) => handleValidate(row.student_id),
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
        <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('graduation.title')}</Typography>
        <PermissionGate permission="graduation.create">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/graduation/new')}
          >
            {t('graduation.add')}
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
        onRowClick={(row) => navigate(`/graduation/${row.id}`)}
        rowActions={rowActions}
        searchPlaceholder={t('graduation.search')}
        emptyMessage={t('graduation.noData')}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        filterValues={{ status: statusFilter }}
        filterFields={[
          {
            name: 'status',
            label: t('graduation.status'),
            options: [
              { value: 'PENDING', label: t('status.pending') },
              { value: 'VALIDATED', label: t('status.validated') },
              { value: 'COMPLETED', label: t('status.completed') },
            ],
          },
        ]}
      />
    {ConfirmDialog}
    </Box>
  );
};

export default GraduationListPage;