// FILE: frontend/src/features/guardians/pages/GuardianListPage.jsx
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
import ListPageHeader from '../../../components/ListPageHeader';
import studentsApi from '../../students/api';
import { usePermissions } from '../../../hooks/usePermissions';
import guardiansApi from '../api';

const GuardianListPage = () => {
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
  const [relationshipFilter, setRelationshipFilter] = useState('');
  // Catalogo de estudiantes para el select del alta rapida.
  const [students, setStudents] = useState([]);
  const searchDebounceRef = useRef(null);

  const columns = [
    { field: 'code', label: t('guardians.code'), sortable: true },
    { field: 'first_name', label: t('guardians.firstName'), sortable: true },
    { field: 'last_name', label: t('guardians.lastName'), sortable: true },
    {
      field: 'student_id',
      label: t('guardians.student'),
      sortable: false,
      render: (value, row) => row.student_name || (value ? `Student ${value}` : '-'),
    },
    { field: 'relationship', label: t('guardians.relationship'), sortable: true },
    { field: 'phone', label: t('guardians.phone'), sortable: true },
    { field: 'email', label: t('guardians.email'), sortable: true },
    {
      field: 'is_primary',
      label: t('guardians.primary'),
      sortable: true,
      render: (value) => value ? 
        <Chip label={t('common.yes')} color="primary" size="small" /> : 
        <Chip label={t('common.no')} color="default" size="small" />,
    },
    {
      field: 'is_emergency_contact',
      label: t('guardians.emergency'),
      sortable: true,
      render: (value) => value ? 
        <Chip label={t('common.yes')} color="error" size="small" /> : 
        <Chip label={t('common.no')} color="default" size="small" />,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await guardiansApi.getAll({
        page: page + 1,
        pageSize,
        search: search || undefined,
        relationship: relationshipFilter || undefined,
      });
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data, total, page, pageSize }` envelope from the backend.
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading guardians:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, relationshipFilter]);

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
    if (name === 'relationship') {
      setPage(0);
      setRelationshipFilter(value);
    }
  };

  const handleDelete = async (id) => {
    if (await confirm(t('common.confirmDelete'))) {
      try {
        await guardiansApi.delete(id);
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
      onClick: (row) => navigate(`/guardians/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/guardians/${row.id}/edit`),
    },
    {
      label: t('common.delete'),
      icon: <DeleteIcon fontSize="small" color="error" />,
      onClick: (row) => handleDelete(row.id),
    },
  ];

  return (
    <Box style={sx({ p: 3 })}>
      {/* Encabezado unico con ALTA RAPIDA: el acudiente se vincula al
          estudiante desde la propia lista, sin navegar a otra pantalla. */}
      <ListPageHeader
        title={t('guardians.title')}
        permission="guardians.create"
        createPath="/guardians/new"
        navigate={navigate}
        onSaved={loadData}
        quickCreate={{
          fields: [
            { name: 'first_name', label: t('guardians.firstName') || 'Nombre', required: true, maxLength: 50 },
            { name: 'last_name', label: t('guardians.lastName') || 'Apellido', required: true, maxLength: 50 },
            { name: 'relationship', label: t('guardians.relationship') || 'Parentesco', required: true, maxLength: 50 },
            { name: 'phone', label: t('guardians.phone') || 'Telefono', type: 'tel', maxLength: 20 },
            { name: 'email', label: t('guardians.email') || 'Email', type: 'email' },
            { name: 'student_id', label: t('guardians.student') || 'Estudiante', type: 'select', required: true, fullWidth: true, options: students.map((s) => ({ value: String(s.id), label: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.code })) },
          ],
          onOpen: async () => {
            if (students.length) return;
            const res = await studentsApi.getAll({ pageSize: 100 });
            setStudents(res?.data || []);
          },
          onSubmit: (payload) => guardiansApi.create(payload),
          title: t('guardians.add') || 'Nuevo acudiente',
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
        onRowClick={(row) => navigate(`/guardians/${row.id}`)}
        rowActions={rowActions}
        searchPlaceholder={t('guardians.search')}
        emptyMessage={t('guardians.noData')}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        filterValues={{ relationship: relationshipFilter }}
        filterFields={[
          {
            name: 'relationship',
            label: t('guardians.relationship'),
            options: [
              { value: 'Padre', label: t('guardians.father') },
              { value: 'Madre', label: t('guardians.mother') },
              { value: 'Tutor', label: t('guardians.tutor') },
              { value: 'Abuelo', label: t('guardians.grandfather') },
              { value: 'Abuela', label: t('guardians.grandmother') },
            ],
          },
        ]}
      />
    {ConfirmDialog}
    </Box>
  );
};

export default GuardianListPage;