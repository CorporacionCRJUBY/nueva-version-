// FILE: frontend/src/features/academicYears/pages/AcademicYearListPage.jsx
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
import { Plus as AddIcon, Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon, CheckCircle2 as CheckCircleIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import PermissionGate from '../../../components/PermissionGate';
import ListPageHeader from '../../../components/ListPageHeader';
import { usePermissions } from '../../../hooks/usePermissions';
import academicYearsApi from '../api';

const AcademicYearListPage = () => {
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
  const searchDebounceRef = useRef(null);

  const columns = [
    { field: 'code', label: t('academicYears.code'), sortable: true },
    { field: 'name', label: t('academicYears.name'), sortable: true },
    {
      field: 'start_date',
      label: t('academicYears.startDate'),
      type: 'date',
      sortable: true,
    },
    {
      field: 'end_date',
      label: t('academicYears.endDate'),
      type: 'date',
      sortable: true,
    },
    {
      field: 'status',
      label: t('academicYears.status'),
      type: 'status',
      sortable: true,
    },
    {
      field: 'is_active',
      label: t('academicYears.active'),
      sortable: true,
      render: (value) => value ? 
        <Chip label={t('common.yes')} color="success" size="small" /> : 
        <Chip label={t('common.no')} color="default" size="small" />,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await academicYearsApi.getAll({
        page: page + 1,
        pageSize,
        search: search || undefined,
      });
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading academic years:', error);
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
        await academicYearsApi.delete(id);
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
      onClick: (row) => navigate(`/academic-years/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/academic-years/${row.id}/edit`),
    },
    {
      label: t('common.delete'),
      icon: <DeleteIcon fontSize="small" color="error" />,
      onClick: (row) => handleDelete(row.id),
    },
  ];

  return (
    <Box style={sx({ p: 3 })}>
      {/* Encabezado unico con ALTA RAPIDA: crear el ano sin salir de la lista. */}
      <ListPageHeader
        title={t('academicYears.title')}
        permission="academic-years.create"
        createPath="/academic-years/new"
        navigate={navigate}
        onSaved={loadData}
        quickCreate={{
          fields: [
            { name: 'name', label: t('academicYears.name') || 'Nombre', required: true, maxLength: 50 },
            { name: 'start_date', label: t('academicYears.startDate') || 'Inicio', type: 'date', required: true },
            { name: 'end_date', label: t('academicYears.endDate') || 'Fin', type: 'date', required: true },
          ],
          onSubmit: (payload) => academicYearsApi.create(payload),
          title: t('academicYears.add') || 'Nuevo ano academico',
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
        onRowClick={(row) => navigate(`/academic-years/${row.id}`)}
        rowActions={rowActions}
        onSearch={handleSearch}
        searchPlaceholder={t('academicYears.search')}
        emptyMessage={t('academicYears.noData')}
      />
    {ConfirmDialog}
    </Box>
  );
};

export default AcademicYearListPage;