// FILE: frontend/src/features/academicPeriods/pages/AcademicPeriodListPage.jsx
import { sx } from '../../../ui/sx';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useConfirm from '../../../hooks/useConfirm';
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Plus as AddIcon, Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon, Lock as LockIcon, X as CloseIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import PermissionGate from '../../../components/PermissionGate';
import ListPageHeader from '../../../components/ListPageHeader';
import academicYearsApi from '../../academicYears/api';
import { usePermissions } from '../../../hooks/usePermissions';
import academicPeriodsApi from '../api';

const AcademicPeriodListPage = () => {
  const { t } = useTranslation();
  const [confirm, ConfirmDialog] = useConfirm();
  const navigate = useNavigate();
  const { canCreate, canEdit } = usePermissions();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  // Catalogo de anos academicos para el select del alta rapida.
  const [years, setYears] = useState([]);
  const searchDebounceRef = useRef(null);

  const columns = [
    { field: 'code', label: t('academicPeriods.code'), sortable: true },
    { field: 'name', label: t('academicPeriods.name'), sortable: true },
    {
      field: 'academic_year_id',
      label: t('academicPeriods.year'),
      sortable: true,
      render: (value, row) => row.year_name || `Year ${value}`,
    },
    {
      field: 'start_date',
      label: t('academicPeriods.startDate'),
      type: 'date',
      sortable: true,
    },
    {
      field: 'end_date',
      label: t('academicPeriods.endDate'),
      type: 'date',
      sortable: true,
    },
    {
      field: 'status',
      label: t('academicPeriods.status'),
      type: 'status',
      sortable: true,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await academicPeriodsApi.getAll({
        page: page + 1,
        pageSize,
        search: search || undefined,
      });
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading periods:', error);
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
        await academicPeriodsApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const handleClose = async (id) => {
    if (await confirm(t('academicPeriods.confirmClose'))) {
      try {
        await academicPeriodsApi.close(id);
        loadData();
      } catch (error) {
        console.error('Error closing:', error);
      }
    }
  };

  const handleLock = async (id) => {
    if (await confirm(t('academicPeriods.confirmLock'))) {
      try {
        await academicPeriodsApi.lock(id);
        loadData();
      } catch (error) {
        console.error('Error locking:', error);
      }
    }
  };

  const rowActions = [
    {
      label: t('common.view'),
      icon: <ViewIcon fontSize="small" />,
      onClick: (row) => navigate(`/academic-periods/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/academic-periods/${row.id}/edit`),
    },
    {
      label: t('academicPeriods.close'),
      icon: <CloseIcon fontSize="small" />,
      onClick: (row) => handleClose(row.id),
      show: (row) => row.status === 'OPEN' && canEdit('academic-periods'),
    },
    {
      label: t('academicPeriods.lock'),
      icon: <LockIcon fontSize="small" />,
      onClick: (row) => handleLock(row.id),
      show: (row) => (row.status === 'OPEN' || row.status === 'CLOSED') && canEdit('academic-periods'),
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
      {/* Encabezado unico con ALTA RAPIDA: el select de ano academico se
          carga al abrir el panel, de modo que el alta se completa sin
          salir de la lista. */}
      <ListPageHeader
        title={t('academicPeriods.title')}
        permission="academic-periods.create"
        createPath="/academic-periods/new"
        navigate={navigate}
        onSaved={loadData}
        quickCreate={{
          fields: [
            { name: 'name', label: t('academicPeriods.name') || 'Nombre', required: true, maxLength: 50 },
            { name: 'academic_year_id', label: t('academicPeriods.academicYear') || 'Ano academico', type: 'select', required: true, options: years.map((y) => ({ value: String(y.id), label: y.name })) },
            { name: 'start_date', label: t('academicPeriods.startDate') || 'Inicio', type: 'date', required: true },
            { name: 'end_date', label: t('academicPeriods.endDate') || 'Fin', type: 'date', required: true },
          ],
          onOpen: async () => {
            if (years.length) return;
            const res = await academicYearsApi.getAll({ pageSize: 100 });
            setYears(res?.data || []);
          },
          onSubmit: (payload) => academicPeriodsApi.create(payload),
          title: t('academicPeriods.add') || 'Nuevo periodo',
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
        onRowClick={(row) => navigate(`/academic-periods/${row.id}`)}
        rowActions={rowActions}
        onSearch={handleSearch}
        searchPlaceholder={t('academicPeriods.search')}
        emptyMessage={t('academicPeriods.noData')}
      />
    {ConfirmDialog}
    </Box>
  );
};

export default AcademicPeriodListPage;