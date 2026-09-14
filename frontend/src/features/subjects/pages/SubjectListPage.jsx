// FILE: frontend/src/features/subjects/pages/SubjectListPage.jsx
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
import { Plus as AddIcon, Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon, Zap as QuickIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import QuickCreateDrawer from '../../../components/QuickCreateDrawer';
import PermissionGate from '../../../components/PermissionGate';
import { usePermissions } from '../../../hooks/usePermissions';
import subjectsApi from '../api';
import branchesApi from '../../branches/api';

const SubjectListPage = () => {
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
  const [filters, setFilters] = useState({ grade: '', status: '' });
  const [search, setSearch] = useState('');
  const searchDebounceRef = useRef(null);

  const columns = [
    { field: 'code', label: t('subjects.code'), sortable: true },
    { field: 'name', label: t('subjects.name'), sortable: true },
    { field: 'description', label: t('subjects.description'), sortable: true },
    { field: 'grade', label: t('subjects.grade'), sortable: true },
    {
      field: 'credits',
      label: t('subjects.credits'),
      sortable: true,
    },
    {
      field: 'hours_per_week',
      label: t('subjects.hours'),
      sortable: true,
    },
    {
      field: 'status',
      label: t('subjects.status'),
      type: 'status',
      sortable: true,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await subjectsApi.getAll({
        page: page + 1,
        pageSize,
        search: search || undefined,
        grade: filters.grade || undefined,
        status: filters.status || undefined,
      });
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading subjects:', error);
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

  /** Alta rápida: crea la materia y refresca la lista sin navegar. */
  const handleQuickCreate = async (payload) => {
    await subjectsApi.create(payload);
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
        await subjectsApi.delete(id);
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
      onClick: (row) => navigate(`/subjects/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/subjects/${row.id}/edit`),
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
        <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('subjects.title')}</Typography>
        <PermissionGate permission="subjects.create">
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
              onClick={() => navigate('/subjects/new')}
            >
              {t('subjects.add')}
            </Button>
          </div>
        </PermissionGate>
      </Box>

      {/* Alta rápida en panel lateral (menos clics, sin perder filtros) */}
      <QuickCreateDrawer
        open={quickOpen}
        title={t('subjects.add') || 'Nueva materia'}
        subtitle={t('common.quickAddHint') !== 'common.quickAddHint' ? t('common.quickAddHint') : 'Se guarda sin salir de la lista'}
        submitLabel={t('common.save') || 'Guardar'}
        cancelLabel={t('common.cancel') || 'Cancelar'}
        onClose={() => setQuickOpen(false)}
        onSubmit={handleQuickCreate}
        fields={[
          { name: 'name', label: t('subjects.name') || 'Nombre', required: true, maxLength: 100 },
          { name: 'description', label: t('subjects.description') || 'Descripción', fullWidth: true, maxLength: 255 },
          { name: 'grade', label: t('subjects.grade') || 'Grado', type: 'select', required: true, options: ['1ro', '2do', '3ro', '4to', '5to', '6to'].map((g) => ({ value: g, label: g })) },
          { name: 'branch_id', label: t('subjects.branch') || 'Sede', type: 'select', required: true, options: branches.map((b) => ({ value: String(b.id), label: b.name })) },
          { name: 'credits', label: t('subjects.credits') || 'Créditos', type: 'number', hint: '1 - 10' },
          { name: 'hours_per_week', label: t('subjects.hours') || 'Horas semanales', type: 'number', hint: '1 - 40' },
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
        onRowClick={(row) => navigate(`/subjects/${row.id}`)}
        rowActions={rowActions}
        onSearch={handleSearch}
        searchPlaceholder={t('subjects.search')}
        emptyMessage={t('subjects.noData')}
        filterValues={filters}
        onFilterChange={handleFilterChange}
        filterFields={[
          {
            name: 'grade',
            label: t('subjects.grade'),
            options: [
              { value: '1ro', label: '1ro' },
              { value: '2do', label: '2do' },
              { value: '3ro', label: '3ro' },
              { value: '4to', label: '4to' },
              { value: '5to', label: '5to' },
              { value: '6to', label: '6to' },
            ],
          },
          {
            name: 'status',
            label: t('subjects.status'),
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

export default SubjectListPage;