// FILE: frontend/src/features/audit/pages/AuditListPage.jsx
import { sx } from '../../../ui/sx';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Eye as ViewIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import PermissionGate from '../../../components/PermissionGate';
import auditApi from '../api';

const AuditListPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const searchDebounceRef = useRef(null);

  const columns = [
    {
      field: 'user_id',
      label: t('audit.user'),
      sortable: true,
      render: (value, row) => row.user_name || `User ${value}`,
    },
    { field: 'action', label: t('audit.action'), sortable: true },
    { field: 'module', label: t('audit.module'), sortable: true },
    { field: 'record_code', label: t('audit.record'), sortable: true },
    {
      field: 'created_at',
      label: t('audit.date'),
      type: 'datetime',
      sortable: true,
    },
    {
      field: 'ip',
      label: t('audit.ip'),
      sortable: true,
      render: (value) => value || '-',
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await auditApi.getAll({
        page: page + 1,
        pageSize,
        search: search || undefined,
        module: moduleFilter || undefined,
        action: actionFilter || undefined,
      });
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data, total, page, pageSize }` envelope from the backend.
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading audit:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, moduleFilter, actionFilter]);

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
    if (name === 'module') setModuleFilter(value);
    if (name === 'action') setActionFilter(value);
  };

  const rowActions = [
    {
      label: t('common.view'),
      icon: <ViewIcon fontSize="small" />,
      onClick: (row) => navigate(`/audit/${row.id}`),
    },
  ];

  return (
    <PermissionGate permission="audit.view">
      <Box style={sx({ p: 3 })}>
        <Typography variant="h4" className="gradient-text" gutterBottom style={sx({ fontWeight: 800 })}>
          {t('audit.title')}
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
          onRowClick={(row) => navigate(`/audit/${row.id}`)}
          rowActions={rowActions}
          searchPlaceholder={t('audit.search')}
          emptyMessage={t('audit.noData')}
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          filterValues={{ module: moduleFilter, action: actionFilter }}
          filterFields={[
            {
              name: 'module',
              label: t('audit.module'),
              options: [
                { value: 'auth', label: 'Auth' },
                { value: 'students', label: 'Students' },
                { value: 'teachers', label: 'Teachers' },
                { value: 'grades', label: 'Grades' },
                { value: 'attendance', label: 'Attendance' },
              ],
            },
            {
              name: 'action',
              label: t('audit.action'),
              options: [
                { value: 'CREATE', label: 'Create' },
                { value: 'UPDATE', label: 'Update' },
                { value: 'DELETE', label: 'Delete' },
                { value: 'LOGIN', label: 'Login' },
                { value: 'LOGOUT', label: 'Logout' },
              ],
            },
          ]}
        />
      </Box>
    </PermissionGate>
  );
};

export default AuditListPage;