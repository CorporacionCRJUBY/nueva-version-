// FILE: frontend/src/features/students/pages/StudentListPage.jsx
import { sx } from '../../../ui/sx';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Button,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Plus as AddIcon, Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon, FileText as RecordIcon, ArrowLeftRight as StatusIcon, Zap as QuickIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import QuickCreateDrawer from '../../../components/QuickCreateDrawer';
import PermissionGate from '../../../components/PermissionGate';
import studentsApi from '../api';
import branchesApi from '../../branches/api';
import academicYearsApi from '../../academicYears/api';
import useAuthImage from '../../../hooks/useAuthImage';

// `photo_url` ya no es una URL pública (ver backend/src/app.js — se quitó el
// mount estático de /uploads por seguridad). Ahora se pide con el token vía
// GET /students/:id/photo, así que necesitamos un componente que use el hook
// de imagen autenticada en vez de pasar la URL cruda a <Avatar src>.
const StudentAvatar = ({ studentId, hasPhoto, initials }) => {
  const { blobUrl } = useAuthImage(hasPhoto ? `/students/${studentId}/photo` : null);
  return (
    <Avatar src={blobUrl || undefined} style={sx({ width: 36, height: 36, bgcolor: '#ede9fe', color: '#4c1d95', fontSize: '0.9rem', fontWeight: 'bold' })}>
      {!blobUrl && initials}
    </Avatar>
  );
};

const StudentListPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [quickOpen, setQuickOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({ grade: '', status: '' });
  // `search` is the debounced value actually sent to the API. It lives in
  // state (not a ref) so that `loadData`'s closure always reads the latest
  // typed value instead of the value from the render where the timer was
  // armed — using a ref/timeout-only approach caused searches to run one
  // keystroke behind what the user had typed.
  const [search, setSearch] = useState('');
  const searchDebounceRef = useRef(null);
  // Delete-confirmation and status-change dialogs (replace window.confirm /
  // window.prompt, which don't match the app's MUI theme and aren't
  // translatable, with proper Material UI dialogs).
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [statusDialogRow, setStatusDialogRow] = useState(null);
  const [statusDialogValue, setStatusDialogValue] = useState('');

  const columns = [
    {
      field: 'photo_url',
      label: '',
      sortable: false,
      minWidth: 56,
      render: (value, row) => (
        <StudentAvatar
          studentId={row.id}
          hasPhoto={Boolean(value)}
          initials={`${row.first_name?.[0] || ''}${row.last_name?.[0] || ''}`}
        />
      ),
    },
    { field: 'code', label: t('students.code'), sortable: true },
    {
      field: 'full_name',
      label: t('students.name'),
      sortable: true,
      render: (value, row) => `${row.first_name} ${row.last_name}`,
    },
    { field: 'email', label: t('students.email'), sortable: true },
    { field: 'phone', label: t('students.phone'), sortable: true },
    { field: 'grade', label: t('students.grade'), sortable: true },
    { field: 'section', label: t('students.section'), sortable: true },
    {
      field: 'status',
      label: t('students.status'),
      type: 'status',
      sortable: true,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await studentsApi.getAll({
        page: page + 1,
        pageSize,
        search: search || undefined,
        grade: filters.grade || undefined,
        status: filters.status || undefined,
      });
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data, total, page, pageSize }` envelope from the backend.
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, filters, search]);

  // Catálogos para el formulario rápido (sede y año académico son obligatorios).
  useEffect(() => {
    let alive = true;
    (async () => {
      const [b, y] = await Promise.allSettled([branchesApi.getAll(), academicYearsApi.getAll()]);
      if (!alive) return;
      if (b.status === 'fulfilled') setBranches(b.value?.data || []);
      if (y.status === 'fulfilled') setAcademicYears(y.value?.data || []);
    })();
    return () => { alive = false; };
  }, []);

  /** Alta rápida: crea el estudiante y refresca la lista en sitio. */
  const handleQuickCreate = async (payload) => {
    await studentsApi.create(payload);
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

  const handleDelete = (id) => setConfirmDeleteId(id);

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    try {
      await studentsApi.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE', 'GRADUATED', 'WITHDRAWN', 'TRANSFERRED', 'SUSPENDED'];

  const handleQuickStatusChange = (row) => {
    setStatusDialogRow(row);
    setStatusDialogValue(row.status);
  };

  const confirmStatusChange = async () => {
    const row = statusDialogRow;
    const nextStatus = statusDialogValue;
    setStatusDialogRow(null);
    if (!nextStatus || nextStatus === row.status) return;
    try {
      await studentsApi.updateStatus(row.id, { status: nextStatus });
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const rowActions = [
    {
      label: t('students.fullRecord'),
      icon: <RecordIcon fontSize="small" color="primary" />,
      onClick: (row) => navigate(`/students/${row.id}/record`),
    },
    {
      label: t('common.view'),
      icon: <ViewIcon fontSize="small" />,
      onClick: (row) => navigate(`/students/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/students/${row.id}/edit`),
    },
    {
      label: t('students.changeStatus'),
      icon: <StatusIcon fontSize="small" />,
      onClick: handleQuickStatusChange,
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
        <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('students.title')}</Typography>
        <PermissionGate permission="students.create">
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
              onClick={() => navigate('/students/new')}
            >
              {t('students.add')}
            </Button>
          </div>
        </PermissionGate>
      </Box>

      {/* Alta rápida en panel lateral: evita el viaje lista → formulario → lista */}
      <QuickCreateDrawer
        open={quickOpen}
        title={t('students.add') || 'Nuevo estudiante'}
        subtitle={t('common.quickAddHint') !== 'common.quickAddHint' ? t('common.quickAddHint') : 'Se guarda sin salir de la lista'}
        submitLabel={t('common.save') || 'Guardar'}
        cancelLabel={t('common.cancel') || 'Cancelar'}
        onClose={() => setQuickOpen(false)}
        onSubmit={handleQuickCreate}
        fields={[
          { name: 'first_name', label: t('students.firstName') || 'Nombre', required: true, maxLength: 50 },
          { name: 'last_name', label: t('students.lastName') || 'Apellido', required: true, maxLength: 50 },
          { name: 'email', label: t('students.email') || 'Email', type: 'email', required: true },
          { name: 'date_of_birth', label: t('students.dateOfBirth') || 'Fecha de nacimiento', type: 'date', required: true },
          { name: 'gender', label: t('students.gender') || 'Género', type: 'select', options: [{ value: 'M', label: 'M' }, { value: 'F', label: 'F' }, { value: 'OTHER', label: 'Otro' }] },
          { name: 'grade', label: t('students.grade') || 'Grado', type: 'select', required: true, options: ['1ro', '2do', '3ro', '4to', '5to', '6to'].map((g) => ({ value: g, label: g })) },
          { name: 'section', label: t('students.section') || 'Sección', type: 'select', options: ['A', 'B', 'C', 'D'].map((s) => ({ value: s, label: s })) },
          { name: 'enrollment_date', label: t('students.enrollmentDate') || 'Fecha de matrícula', type: 'date', required: true },
          { name: 'branch_id', label: t('students.branch') || 'Sede', type: 'select', required: true, options: branches.map((b) => ({ value: String(b.id), label: b.name })) },
          { name: 'academic_year_id', label: t('students.academicYear') || 'Año académico', type: 'select', required: true, options: academicYears.map((y) => ({ value: String(y.id), label: y.name })) },
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
        onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
        onRefresh={loadData}
        onSearch={handleSearch}
        onRowClick={(row) => navigate(`/students/${row.id}/record`)}
        rowActions={rowActions}
        searchPlaceholder={t('students.search')}
        emptyMessage={t('students.noData')}
        filterFields={[
          {
            name: 'grade',
            label: t('students.grade'),
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
            label: t('students.status'),
            options: [
              { value: 'ACTIVE', label: t('status.active') },
              { value: 'INACTIVE', label: t('status.inactive') },
              { value: 'GRADUATED', label: t('status.graduated') },
              { value: 'WITHDRAWN', label: t('status.withdrawn') },
              { value: 'TRANSFERRED', label: t('status.transferred') },
              { value: 'SUSPENDED', label: t('status.suspended') },
            ],
          },
        ]}
        filterValues={filters}
        onFilterChange={handleFilterChange}
      />

      <Dialog open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)}>
        <DialogTitle>{t('common.confirmDelete')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('students.confirmDeleteStudent')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>{t('common.cancel')}</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            {t('common.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!statusDialogRow} onClose={() => setStatusDialogRow(null)} fullWidth maxWidth="xs">
        <DialogTitle>{t('students.changeStatus')}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth style={sx({ mt: 1 })}>
            <InputLabel>{t('students.status')}</InputLabel>
            <Select
              label={t('students.status')}
              value={statusDialogValue}
              onChange={(e) => setStatusDialogValue(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>{t(`status.${s.toLowerCase()}`)}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogRow(null)}>{t('common.cancel')}</Button>
          <Button onClick={confirmStatusChange} variant="contained">
            {t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentListPage;
