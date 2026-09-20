// FILE: frontend/src/features/previousSchools/pages/PreviousSchoolListPage.jsx
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
import previousSchoolsApi from '../api';

const PreviousSchoolListPage = () => {
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
  // Catalogo de estudiantes para el alta rapida.
  const [students, setStudents] = useState([]);
  const searchDebounceRef = useRef(null);

  const columns = [
    { field: 'code', label: t('previousSchools.code'), sortable: true },
    {
      field: 'student_id',
      label: t('previousSchools.student'),
      sortable: true,
      render: (value, row) => row.student_name || `Student ${value}`,
    },
    { field: 'school_name', label: t('previousSchools.school'), sortable: true },
    { field: 'grade_level', label: t('previousSchools.grade'), sortable: true },
    { field: 'year_attended', label: t('previousSchools.year'), sortable: true },
    {
      field: 'transcript_received',
      label: t('previousSchools.transcript'),
      sortable: true,
      render: (value) => value ? 
        <Chip label={t('common.yes')} color="success" size="small" /> : 
        <Chip label={t('common.no')} color="default" size="small" />,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await previousSchoolsApi.getAll({
        page: page + 1,
        pageSize,
        search: search || undefined,
      });
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data, total, page, pageSize }` envelope from the backend.
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading previous schools:', error);
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
        await previousSchoolsApi.delete(id);
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
      onClick: (row) => navigate(`/previous-schools/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/previous-schools/${row.id}/edit`),
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
        <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('previousSchools.title')}</Typography>
      </Box>

      {/* Encabezado unico con ALTA RAPIDA: registrar la escuela de
          procedencia sin salir del listado. */}
      <div style={sx({ mt: -2 })}>
        <ListPageHeader
          title=""
          permission="previous-schools.create"
          createPath="/previous-schools/new"
          navigate={navigate}
          onSaved={loadData}
          quickCreate={{
            fields: [
              { name: 'student_id', label: t('previousSchools.student') || 'Estudiante', type: 'select', required: true, fullWidth: true, options: students.map((s) => ({ value: String(s.id), label: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.code })) },
              { name: 'school_name', label: t('previousSchools.school') || 'Escuela', required: true, maxLength: 100 },
              { name: 'grade_level', label: t('previousSchools.grade') || 'Grado', maxLength: 20 },
              { name: 'year_attended', label: t('previousSchools.year') || 'Ano', required: true, maxLength: 9 },
            ],
            onOpen: async () => {
              if (students.length) return;
              const res = await studentsApi.getAll({ pageSize: 100 });
              setStudents(res?.data || []);
            },
            onSubmit: (payload) => previousSchoolsApi.create(payload),
            title: t('previousSchools.add') || 'Nueva escuela previa',
            quickLabel: t('common.quickAdd') || 'Alta rapida',
          }}
        />
      </div>

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
        onRowClick={(row) => navigate(`/previous-schools/${row.id}`)}
        rowActions={rowActions}
        searchPlaceholder={t('previousSchools.search')}
        emptyMessage={t('previousSchools.noData')}
        onSearch={handleSearch}
      />
    {ConfirmDialog}
    </Box>
  );
};

export default PreviousSchoolListPage;