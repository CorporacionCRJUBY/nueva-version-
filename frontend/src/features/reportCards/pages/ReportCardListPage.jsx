// FILE: frontend/src/features/reportCards/pages/ReportCardListPage.jsx
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
import reportCardsApi from '../api';

const ReportCardListPage = () => {
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
    { field: 'code', label: t('reportCards.code'), sortable: true },
    {
      field: 'student_id',
      label: t('reportCards.student'),
      sortable: true,
      render: (value, row) => row.student_name || `Student ${value}`,
    },
    {
      field: 'academic_period_id',
      label: t('reportCards.period'),
      sortable: true,
      render: (value, row) => row.academic_period_name || `Period ${value}`,
    },
    {
      field: 'report_date',
      label: t('reportCards.date'),
      type: 'date',
      sortable: true,
    },
    {
      field: 'status',
      label: t('reportCards.status'),
      type: 'status',
      sortable: true,
    },
    {
      field: 'version_number',
      label: t('reportCards.version'),
      sortable: true,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await reportCardsApi.getAll({
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
      console.error('Error loading report cards:', error);
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
        await reportCardsApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const handleGenerate = async (id) => {
    try {
      await reportCardsApi.generate(id);
      loadData();
    } catch (error) {
      console.error('Error generating report card:', error);
    }
  };

  const handlePreview = async (id) => {
    try {
      await reportCardsApi.preview(id);
    } catch (error) {
      console.error('Error previewing report card:', error);
    }
  };

  const rowActions = [
    {
      label: t('common.view'),
      icon: <ViewIcon fontSize="small" />,
      onClick: (row) => navigate(`/report-cards/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/report-cards/${row.id}/edit`),
      show: (row) => row.status === 'DRAFT',
    },
    {
      label: t('reportCards.generate'),
      icon: <GenerateIcon fontSize="small" color="primary" />,
      onClick: (row) => handleGenerate(row.id),
      show: (row) => row.status !== 'OFFICIAL',
    },
    {
      label: t('reportCards.preview'),
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
        <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('reportCards.title')}</Typography>
        <PermissionGate permission="report-cards.create">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/report-cards/new')}
          >
            {t('reportCards.add')}
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
        onRowClick={(row) => navigate(`/report-cards/${row.id}`)}
        rowActions={rowActions}
        searchPlaceholder={t('reportCards.search')}
        emptyMessage={t('reportCards.noData')}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        filterValues={{ status: statusFilter }}
        filterFields={[
          {
            name: 'status',
            label: t('reportCards.status'),
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

export default ReportCardListPage;
