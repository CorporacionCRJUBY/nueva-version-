// FILE: frontend/src/features/users/pages/UserListPage.jsx
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Plus as AddIcon, Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon, KeyRound as PasswordIcon, Gavel as RolesIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import PermissionGate from '../../../components/PermissionGate';
import { usePermissions } from '../../../hooks/usePermissions';
import usersApi from '../api';

const UserListPage = () => {
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
  const [statusFilter, setStatusFilter] = useState('');
  const searchDebounceRef = useRef(null);

  // BUG REAL CORREGIDO (y mejora de usabilidad): la accion "Cambiar
  // contrasena" llevaba a `/users/:id/change-password`, que renderiza
  // UserFormPage (el formulario de EDICION completo). Ese formulario solo
  // tiene el campo de contrasena NUEVA: no pide la contrasena actual que
  // exige el backend (`changePassword` valida `currentPassword` contra el
  // hash guardado), asi que la operacion fallaba SIEMPRE con un 400.
  // Ahora la accion abre un dialogo rapido en la propia lista, pide las dos
  // contrasenas y guarda sin salir de la pantalla.
  const [pwDialog, setPwDialog] = useState({ open: false, userId: null, userName: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwError, setPwError] = useState(null);
  const [pwSaving, setPwSaving] = useState(false);

  const openPasswordDialog = (row) => {
    setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPwError(null);
    setPwDialog({ open: true, userId: row.id, userName: row.full_name || row.email });
  };

  const handleChangePassword = async () => {
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError(t('users.passwordMismatch') || 'Las contrasenas no coinciden');
      return;
    }
    setPwSaving(true);
    setPwError(null);
    try {
      await usersApi.changePassword(pwDialog.userId, {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwDialog({ open: false, userId: null, userName: '' });
    } catch (error) {
      // El backend devuelve { success:false, error:{ message } }.
      setPwError(error?.error?.message || error?.message || 'No se pudo cambiar la contrasena');
    } finally {
      setPwSaving(false);
    }
  };

  const columns = [
    { field: 'code', label: t('users.code'), sortable: true },
    { field: 'full_name', label: t('users.fullName'), sortable: true },
    { field: 'email', label: t('users.email'), sortable: true },
    { field: 'phone', label: t('users.phone'), sortable: true },
    {
      field: 'role_id',
      label: t('users.role'),
      sortable: true,
      render: (value, row) => row.role_name || `Role ${value}`,
    },
    {
      field: 'branch_id',
      label: t('users.branch'),
      sortable: true,
      render: (value, row) => row.branch_name || (value ? `Branch ${value}` : '-'),
    },
    {
      field: 'status',
      label: t('users.status'),
      type: 'status',
      sortable: true,
    },
    {
      field: 'last_login',
      label: t('users.lastLogin'),
      type: 'datetime',
      sortable: true,
      render: (value) => value ? new Date(value).toLocaleString() : '-',
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await usersApi.getAll({
        page: page + 1,
        pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
      });
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data, total, page, pageSize }` envelope from the backend.
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, statusFilter]);

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
    if (name === 'status') {
      setPage(0);
      setStatusFilter(value);
    }
  };

  const handleDelete = async (id) => {
    if (await confirm(t('common.confirmDelete'))) {
      try {
        await usersApi.delete(id);
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
      onClick: (row) => navigate(`/users/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/users/${row.id}/edit`),
    },
    {
      label: t('users.changePassword'),
      icon: <PasswordIcon fontSize="small" color="warning" />,
      onClick: (row) => openPasswordDialog(row),
    },
    {
      label: t('users.assignRoles'),
      icon: <RolesIcon fontSize="small" color="primary" />,
      onClick: (row) => navigate(`/users/${row.id}/roles`),
    },
    {
      label: t('common.delete'),
      icon: <DeleteIcon fontSize="small" color="error" />,
      onClick: (row) => handleDelete(row.id),
    },
  ];

  return (
    <PermissionGate permission="users.view">
      <Box style={sx({ p: 3 })}>
        <Box style={sx({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' })}>
          <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('users.title')}</Typography>
          <PermissionGate permission="users.create">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/users/new')}
            >
              {t('users.add')}
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
          onRowClick={(row) => navigate(`/users/${row.id}`)}
          rowActions={rowActions}
          searchPlaceholder={t('users.search')}
          emptyMessage={t('users.noData')}
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          filterValues={{ status: statusFilter }}
          filterFields={[
            {
              name: 'status',
              label: t('users.status'),
              options: [
                { value: 'ACTIVE', label: t('status.active') },
                { value: 'INACTIVE', label: t('status.inactive') },
                { value: 'SUSPENDED', label: t('status.suspended') },
              ],
            },
          ]}
        />
      {ConfirmDialog}

      {/* Dialogo rapido de cambio de contrasena: sustituye el viaje a un
          formulario completo que no pedia la contrasena actual. */}
      <Dialog open={pwDialog.open} onClose={() => !pwSaving && setPwDialog({ open: false, userId: null, userName: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {t('users.changePassword') || 'Cambiar contrasena'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" style={sx({ mb: 2, color: 'text.secondary' })}>
            {pwDialog.userName}
          </Typography>
          {pwError && (
            <Alert severity="error" style={sx({ mb: 2 })} onClose={() => setPwError(null)}>
              {pwError}
            </Alert>
          )}
          <TextField
            fullWidth
            margin="dense"
            type="password"
            name="currentPassword"
            label={t('users.currentPassword') || 'Contrasena actual'}
            value={pwForm.currentPassword}
            onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
            autoComplete="new-password"
          />
          <TextField
            fullWidth
            margin="dense"
            type="password"
            name="newPassword"
            label={t('users.newPassword') || 'Nueva contrasena'}
            value={pwForm.newPassword}
            onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
            autoComplete="new-password"
          />
          <TextField
            fullWidth
            margin="dense"
            type="password"
            name="confirmPassword"
            label={t('users.confirmPassword') || 'Confirmar contrasena'}
            value={pwForm.confirmPassword}
            onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            autoComplete="new-password"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPwDialog({ open: false, userId: null, userName: '' })} disabled={pwSaving}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleChangePassword}
            disabled={pwSaving || !pwForm.currentPassword || !pwForm.newPassword}
          >
            {pwSaving ? <CircularProgress size={20} /> : t('common.save')}
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </PermissionGate>
  );
};

export default UserListPage;