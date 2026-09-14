// FILE: frontend/src/features/teachers/pages/TeacherListPage.jsx
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
import { Plus as AddIcon, Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon, ClipboardList as AssignmentsIcon, Zap as QuickIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import QuickCreateDrawer from '../../../components/QuickCreateDrawer';
import PermissionGate from '../../../components/PermissionGate';
import { usePermissions } from '../../../hooks/usePermissions';
import teachersApi from '../api';
import branchesApi from '../../branches/api';

const TeacherListPage = () => {
  const { t } = useTranslation();
  const [confirm, ConfirmDialog] = useConfirm();
  const navigate = useNavigate();
  const { canCreate } = usePermissions();
  const [quickOpen, setQuickOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({ status: '' });
  // `search` is the debounced value actually sent to the API (kept in state,
  // not a ref, so loadData's closure always reads the latest typed value).
  const [search, setSearch] = useState('');
  const searchDebounceRef = useRef(null);

  const columns = [
    { field: 'code', label: t('teachers.code'), sortable: true },
    {
      field: 'full_name',
      label: t('teachers.name'),
      sortable: true,
      render: (value, row) => `${row.first_name} ${row.last_name}`,
    },
    { field: 'email', label: t('teachers.email'), sortable: true },
    { field: 'phone', label: t('teachers.phone'), sortable: true },
    { field: 'specialization', label: t('teachers.specialization'), sortable: true },
    {
      field: 'hire_date',
      label: t('teachers.hireDate'),
      type: 'date',
      sortable: true,
    },
    {
      field: 'status',
      label: t('teachers.status'),
      type: 'status',
      sortable: true,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await teachersApi.getAll({
        page: page + 1,
        pageSize,
        search: search || undefined,
        status: filters.status || undefined,
      });
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data, total, page, pageSize }` envelope from the backend.
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, filters, search]);

  // Sedes para el selector del formulario rápido.
  useEffect(() => {
    let alive = true;
    branchesApi
      .getAll()
      .then((res) => alive && setBranches(res?.data || []))
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  /** Alta rápida: crea el docente y refresca la lista sin navegar. */
  const handleQuickCreate = async (payload) => {
    await teachersApi.create(payload);
    setPage(0);
    setSearch('');
    await loadData();
  };

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
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleDelete = async (id) => {
    if (await confirm(t('common.confirmDelete'))) {
      try {
        await teachersApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const rowActions = [
    {
      label: t('teachers.assignments'),
      icon: <AssignmentsIcon fontSize="small" color="primary" />,
      onClick: (row) => navigate(`/teachers/${row.id}/assignments`),
    },
    {
      label: t('common.view'),
      icon: <ViewIcon fontSize="small" />,
      onClick: (row) => navigate(`/teachers/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/teachers/${row.id}/edit`),
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
        <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('teachers.title')}</Typography>
        <PermissionGate permission="teachers.create">
          <div className="flex items-center gap-2">
            <Button
              variant="outlined"
              startIcon={<QuickIcon />}
              onClick={() => setQuickOpen(true)}
            >
              {t('common.quickAdd') !== 'common.quickAdd' ? t('common.quickAdd') : 'Alta rápida'}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/teachers/new')}
            >
              {t('teachers.add')}
            </Button>
          </div>
        </PermissionGate>
      </Box>

      {/* Alta rápida en panel lateral (menos clics, sin perder filtros) */}
      <QuickCreateDrawer
        open={quickOpen}
        title={t('teachers.add') || 'Nuevo docente'}
        subtitle={t('common.quickAddHint') !== 'common.quickAddHint' ? t('common.quickAddHint') : 'Se guarda sin salir de la lista'}
        submitLabel={t('common.save') || 'Guardar'}
        cancelLabel={t('common.cancel') || 'Cancelar'}
        onClose={() => setQuickOpen(false)}
        onSubmit={handleQuickCreate}
        fields={[
          { name: 'first_name', label: t('teachers.firstName') || 'Nombre', required: true, maxLength: 50 },
          { name: 'last_name', label: t('teachers.lastName') || 'Apellido', required: true, maxLength: 50 },
          { name: 'email', label: t('teachers.email') || 'Email', type: 'email', required: true },
          { name: 'phone', label: t('teachers.phone') || 'Teléfono', type: 'tel' },
          { name: 'hire_date', label: t('teachers.hireDate') || 'Fecha de contratación', type: 'date' },
          { name: 'branch_id', label: t('teachers.branch') || 'Sede', type: 'select', required: true, options: branches.map((b) => ({ value: String(b.id), label: b.name })) },
        ]}
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
        onRowClick={(row) => navigate(`/teachers/${row.id}`)}
        rowActions={rowActions}
        onSearch={handleSearch}
        searchPlaceholder={t('teachers.search')}
        emptyMessage={t('teachers.noData')}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        filterFields={[
          {
            name: 'status',
            label: t('teachers.status'),
            options: [
              { value: 'ACTIVE', label: t('status.active') },
              { value: 'INACTIVE', label: t('status.inactive') },
            ],
          },
        ]}
      />
    {ConfirmDialog}
    </Box>
  );
};

export default TeacherListPage;