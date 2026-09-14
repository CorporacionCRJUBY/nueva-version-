// FILE: frontend/src/features/branches/pages/BranchListPage.jsx
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
} from '@mui/material';
import { Plus as AddIcon, Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import PermissionGate from '../../../components/PermissionGate';
import ListPageHeader from '../../../components/ListPageHeader';
import { usePermissions } from '../../../hooks/usePermissions';
import branchesApi from '../api';

const BranchListPage = () => {
  const { t } = useTranslation();
  const [confirm, ConfirmDialog] = useConfirm();
  const navigate = useNavigate();
  const { canCreate } = usePermissions();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  // `search` is the debounced value actually sent to the API (kept in state,
  // not a ref, so loadData's closure always reads the latest typed value).
  const [search, setSearch] = useState('');
  const searchDebounceRef = useRef(null);

  const columns = [
    { field: 'code', label: t('branches.code'), sortable: true },
    { field: 'name', label: t('branches.name'), sortable: true },
    { field: 'address', label: t('branches.address'), sortable: true },
    { field: 'phone', label: t('branches.phone'), sortable: true },
    { field: 'email', label: t('branches.email'), sortable: true },
    {
      field: 'status',
      label: t('branches.status'),
      type: 'status',
      sortable: true,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await branchesApi.getAll({
        page: page + 1,
        pageSize,
        search: search || undefined,
      });
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data, total, page, pageSize }` envelope from the backend.
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading branches:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search]);

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

  const handleDelete = async (id) => {
    if (await confirm(t('common.confirmDelete'))) {
      try {
        await branchesApi.delete(id);
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
      onClick: (row) => navigate(`/branches/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/branches/${row.id}/edit`),
    },
    {
      label: t('common.delete'),
      icon: <DeleteIcon fontSize="small" color="error" />,
      onClick: (row) => handleDelete(row.id),
    },
  ];

  return (
    <Box style={sx({ p: 3 })}>
      {/* Encabezado unico: titulo + alta completa + ALTA RAPIDA en panel
          lateral, para no perder filtros ni pagina al dar de alta una sede. */}
      <ListPageHeader
        title={t('branches.title')}
        permission="branches.create"
        createPath="/branches/new"
        navigate={navigate}
        onSaved={loadData}
        quickCreate={{
          fields: [
            { name: 'name', label: t('branches.name') || 'Nombre', required: true, maxLength: 100 },
            { name: 'address', label: t('branches.address') || 'Direccion', fullWidth: true, maxLength: 255 },
            { name: 'phone', label: t('branches.phone') || 'Telefono', type: 'tel', maxLength: 20 },
            { name: 'email', label: t('branches.email') || 'Email', type: 'email' },
          ],
          onSubmit: (payload) => branchesApi.create(payload),
          title: t('branches.add') || 'Nueva sede',
          quickLabel: t('common.quickAdd') || 'Alta rapida',
        }}
      />

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
        onRowClick={(row) => navigate(`/branches/${row.id}`)}
        rowActions={rowActions}
        onSearch={handleSearch}
        searchPlaceholder={t('branches.search')}
        emptyMessage={t('branches.noData')}
      />
    {ConfirmDialog}
    </Box>
  );
};

export default BranchListPage;