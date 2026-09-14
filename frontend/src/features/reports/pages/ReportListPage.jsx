// FILE: frontend/src/features/reports/pages/ReportListPage.jsx
import { sx } from '../../../ui/sx';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import { Eye as ViewIcon, FileText as PdfIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import PermissionGate from '../../../components/PermissionGate';
import reportsApi from '../api';

const ReportListPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const searchDebounceRef = useRef(null);

  const columns = [
    { field: 'code', label: t('reports.code'), sortable: true },
    {
      field: 'category',
      label: t('reports.category'),
      sortable: true,
    },
    {
      field: 'student_id',
      label: t('reports.student'),
      sortable: true,
      render: (value, row) => row.student_name || `Student ${value}`,
    },
    {
      field: 'report_date',
      label: t('reports.date'),
      type: 'date',
      sortable: true,
    },
    {
      field: 'status',
      label: t('reports.status'),
      type: 'status',
      sortable: true,
    },
    {
      field: 'version_number',
      label: t('reports.version'),
      sortable: true,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await reportsApi.getAll({
        page: page + 1,
        pageSize,
        search: search || undefined,
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
      });
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data, total, page, pageSize }` envelope from the backend.
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, categoryFilter, statusFilter]);

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
    if (name === 'category') setCategoryFilter(value);
    if (name === 'status') setStatusFilter(value);
  };

  const handlePreview = async (row) => {
    // pdf_url ya no existe como URL pública (ver backend/src/app.js); se pide
    // el PDF con el token y se abre el blob resultante en una nueva pestaña.
    if (!row.has_pdf) return;
    try {
      const blobUrl = await reportsApi.getPreviewBlobUrl(row.id);
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('[Reports] preview failed', err);
    }
  };

  const rowActions = [
    {
      label: t('common.view'),
      icon: <ViewIcon fontSize="small" />,
      onClick: (row) => navigate(`/reports/${row.id}`),
    },
    {
      label: t('reports.preview'),
      icon: <PdfIcon fontSize="small" color="error" />,
      onClick: (row) => handlePreview(row),
      show: (row) => row.status === 'OFFICIAL' || row.status === 'ARCHIVED',
    },
  ];

  return (
    <PermissionGate permission="reports.view">
      <Box style={sx({ p: 3 })}>
        <Typography variant="h4" className="gradient-text" gutterBottom style={sx({ fontWeight: 800 })}>
          {t('reports.title')}
        </Typography>

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
          onRowClick={(row) => navigate(`/reports/${row.id}`)}
          rowActions={rowActions}
          searchPlaceholder={t('reports.search')}
          emptyMessage={t('reports.noData')}
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          filterValues={{ category: categoryFilter, status: statusFilter }}
          filterFields={[
            {
              name: 'category',
              label: t('reports.category'),
              options: [
                { value: 'attendance', label: t('reports.attendance') },
                { value: 'grades', label: t('reports.grades') },
                { value: 'progress-reports', label: t('reports.progressReports') },
                { value: 'report-cards', label: t('reports.reportCards') },
                { value: 'academic-history', label: t('reports.academicHistory') },
                { value: 'transcripts', label: t('reports.transcripts') },
                { value: 'scholarships', label: t('reports.scholarships') },
                { value: 'graduation', label: t('reports.graduation') },
              ],
            },
            {
              name: 'status',
              label: t('reports.status'),
              options: [
                { value: 'DRAFT', label: t('status.draft') },
                { value: 'OFFICIAL', label: t('status.official') },
                { value: 'ARCHIVED', label: t('status.archived') },
                { value: 'REPRINTED', label: t('status.reprinted') },
              ],
            },
          ]}
        />
      </Box>
    </PermissionGate>
  );
};

export default ReportListPage;