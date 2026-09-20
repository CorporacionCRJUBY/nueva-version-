// FILE: frontend/src/features/permissions/pages/PermissionListPage.jsx
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
import permissionsApi from '../api';

const PermissionListPage = () => {
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
  const [moduleFilter, setModuleFilter] = useState('');
  const searchDebounceRef = useRef(null);

  const columns = [
    { field: 'code', label: t('permissions.code'), sortable: true },
    { field: 'module', label: t('permissions.module'), sortable: true },
    { field: 'action', label: t('permissions.action'), sortable: true },
    { field: 'description', label: t('permissions.description'), sortable: true },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await permissionsApi.getAll({
        page: page + 1,
        pageSize,
        search: search || undefined,
        module: moduleFilter || undefined,
      });
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data, total, page, pageSize }` envelope from the backend.
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, moduleFilter]);

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
    if (name === 'module') {
      setPage(0);
      setModuleFilter(value);
    }
  };

  const handleDelete = async (id) => {
    if (await confirm(t('common.confirmDelete'))) {
      try {
        await permissionsApi.delete(id);
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
      onClick: (row) => navigate(`/permissions/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/permissions/${row.id}/edit`),
    },
    {
      label: t('common.delete'),
      icon: <DeleteIcon fontSize="small" color="error" />,
      onClick: (row) => handleDelete(row.id),
    },
  ];

  return (
    <PermissionGate permission="permissions.view">
      <Box style={sx({ p: 3 })}>
        <Box style={sx({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' })}>
          <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('permissions.title')}</Typography>
          <PermissionGate permission="permissions.create">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/permissions/new')}
            >
              {t('permissions.add')}
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
          onRowClick={(row) => navigate(`/permissions/${row.id}`)}
          rowActions={rowActions}
          searchPlaceholder={t('permissions.search')}
          emptyMessage={t('permissions.noData')}
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          filterValues={{ module: moduleFilter }}
          filterFields={[
            {
              name: 'module',
              label: t('permissions.module'),
              options: [
                { value: 'students', label: 'Students' },
                { value: 'teachers', label: 'Teachers' },
                { value: 'subjects', label: 'Subjects' },
                { value: 'grades', label: 'Grades' },
                { value: 'attendance', label: 'Attendance' },
                { value: 'users', label: 'Users' },
                { value: 'audit', label: 'Audit' },
                { value: 'settings', label: 'Settings' },
                { value: 'reports', label: 'Reports' },
              ],
            },
          ]}
        />
      {ConfirmDialog}
      </Box>
    </PermissionGate>
  );
};

export default PermissionListPage;