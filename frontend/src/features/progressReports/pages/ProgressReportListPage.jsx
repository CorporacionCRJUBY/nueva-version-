// FILE: frontend/src/features/progressReports/pages/ProgressReportListPage.jsx
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
import { Plus as AddIcon, Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon, FileText as PdfIcon, Play as GenerateIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import PermissionGate from '../../../components/PermissionGate';
import { usePermissions } from '../../../hooks/usePermissions';
import progressReportsApi from '../api';

const ProgressReportListPage = () => {
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
    { field: 'code', label: t('progressReports.code'), sortable: true },
    {
      field: 'student_id',
      label: t('progressReports.student'),
      sortable: true,
      render: (value, row) => row.student_name || `Student ${value}`,
    },
    {
      field: 'academic_period_id',
      label: t('progressReports.period'),
      sortable: true,
      render: (value, row) => row.academic_period_name || `Period ${value}`,
    },
    {
      field: 'report_date',
      label: t('progressReports.date'),
      type: 'date',
      sortable: true,
    },
    {
      field: 'status',
      label: t('progressReports.status'),
      type: 'status',
      sortable: true,
    },
    {
      field: 'version_number',
      label: t('progressReports.version'),
      sortable: true,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await progressReportsApi.getAll({
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
      console.error('Error loading progress reports:', error);
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
        await progressReportsApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const handleGenerate = async (id) => {
    try {
      await progressReportsApi.generate(id);
      loadData();
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  const handlePreview = async (id) => {
    try {
      await progressReportsApi.preview(id);
    } catch (error) {
      console.error('Error previewing report:', error);
    }
  };

  const rowActions = [
    {
      label: t('common.view'),
      icon: <ViewIcon fontSize="small" />,
      onClick: (row) => navigate(`/progress-reports/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/progress-reports/${row.id}/edit`),
      show: (row) => row.status === 'DRAFT',
    },
    {
      label: t('progressReports.generate'),
      icon: <GenerateIcon fontSize="small" color="primary" />,
      onClick: (row) => handleGenerate(row.id),
      show: (row) => row.status !== 'OFFICIAL',
    },
    {
      label: t('progressReports.preview'),
      icon: <PdfIcon fontSize="small" color="error" />,
      onClick: (row) => handlePreview(row.id),
      show: (row) => row.status === 'OFFICIAL' || row.status === 'ARCHIVED',
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
        <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('progressReports.title')}</Typography>
        <PermissionGate permission="progress-reports.create">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/progress-reports/new')}
          >
            {t('progressReports.add')}
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
        onRowClick={(row) => navigate(`/progress-reports/${row.id}`)}
        rowActions={rowActions}
        searchPlaceholder={t('progressReports.search')}
        emptyMessage={t('progressReports.noData')}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        filterValues={{ status: statusFilter }}
        filterFields={[
          {
            name: 'status',
            label: t('progressReports.status'),
            options: [
              { value: 'DRAFT', label: t('status.draft') },
              { value: 'OFFICIAL', label: t('status.official') },
              { value: 'ARCHIVED', label: t('status.archived') },
            ],
          },
        ]}
      />
    {ConfirmDialog}
    </Box>
  );
};

export default ProgressReportListPage;
