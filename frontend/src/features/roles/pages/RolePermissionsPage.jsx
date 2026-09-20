// FILE: frontend/src/features/roles/pages/RolePermissionsPage.jsx
import { sx } from '../../../ui/sx';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider,
  Chip,
} from '@mui/material';
import { Save as SaveIcon, XCircle as CancelIcon, Lock as PermissionsIcon } from 'lucide-react';
import rolesApi from '../api';
import permissionsApi from '../../permissions/api';
import { usePermissions } from '../../../hooks/usePermissions';

const RolePermissionsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { canEdit } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [role, setRole] = useState(null);
  const [allPermissions, setAllPermissions] = useState([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState([]);

  // El backend bloquea la edición de permisos del rol SUPER_ADMIN (ese rol
  // siempre tiene acceso total) y también los del propio rol del usuario
  // autenticado, así que la pantalla lo refleja deshabilitando los checks.
  const isSuperAdmin = role?.name === 'SUPER_ADMIN';

  // FIX (bitácora 2026-09-16): un ADMIN puede ENTRAR a esta pantalla (tiene
  // roles.view, para poder listar roles al asignarlos a un usuario) pero no
  // tiene roles.edit — esa administración del catálogo sigue reservada a
  // SUPER_ADMIN. Sin este check, ADMIN veía los checks habilitados, hacía
  // clic en Guardar y recién ahí se topaba con un 403 crudo del backend.
  const canEditRoles = canEdit('roles');
  const readOnly = isSuperAdmin || !canEditRoles;

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [roleRes, permissionsRes, assignedRes] = await Promise.all([
        rolesApi.getById(id),
        permissionsApi.getAll({ pageSize: 1000 }),
        rolesApi.getPermissions(id),
      ]);
      // `api.get` unwraps axios' response.data, así que cada `Res` aquí es
      // el envelope `{ success, data, ... }` del backend.
      setRole(roleRes?.data || roleRes);
      setAllPermissions(permissionsRes?.data || []);
      const assigned = assignedRes?.data || [];
      setSelectedPermissionIds(assigned.map((p) => p.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const permissionsByModule = useMemo(() => {
    const grouped = {};
    allPermissions.forEach((perm) => {
      if (!grouped[perm.module]) grouped[perm.module] = [];
      grouped[perm.module].push(perm);
    });
    return grouped;
  }, [allPermissions]);

  const handleTogglePermission = (permissionId) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permissionId) ? prev.filter((pid) => pid !== permissionId) : [...prev, permissionId]
    );
  };

  const handleToggleModule = (modulePermissions, checked) => {
    const ids = modulePermissions.map((p) => p.id);
    setSelectedPermissionIds((prev) =>
      checked ? [...new Set([...prev, ...ids])] : prev.filter((pid) => !ids.includes(pid))
    );
  };

  const handleSave = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await rolesApi.assignPermissions(id, selectedPermissionIds);
      navigate('/roles');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box style={sx({ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' })}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box style={sx({ display: 'flex', alignItems: 'center', gap: 1, mb: 3 })}>
        <PermissionsIcon color="primary" />
        <Typography variant="h5" style={sx({ fontWeight: 600 })}>
          {t('roles.assignPermissions', { defaultValue: 'Asignar permisos' })}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" style={sx({ mb: 2 })}>
          {error}
        </Alert>
      )}

      {isSuperAdmin && (
        <Alert severity="info" style={sx({ mb: 2 })}>
          {t('roles.superAdminAlwaysFullAccess', {
            defaultValue: 'El rol SUPER_ADMIN siempre tiene acceso total y no puede modificarse.',
          })}
        </Alert>
      )}

      {!isSuperAdmin && !canEditRoles && (
        <Alert severity="info" style={sx({ mb: 2 })}>
          {t('roles.viewOnlyNoEditPermission', {
            defaultValue:
              'Puede consultar los permisos de este rol, pero solo un SUPER_ADMIN puede modificarlos.',
          })}
        </Alert>
      )}

      <Paper style={sx({ p: 3 })}>
        {role && (
          <>
            <Typography variant="subtitle1" style={sx({ fontWeight: 600 })}>
              {role.name}
            </Typography>
            {role.description && (
              <Typography variant="body2" color="text.secondary" style={sx({ mb: 1 })}>
                {role.description}
              </Typography>
            )}
            <Divider style={sx({ my: 2 })} />
          </>
        )}

        <Typography variant="subtitle2" style={sx({ mb: 1 })}>
          {t('roles.availablePermissions', { defaultValue: 'Permisos disponibles' })}
        </Typography>

        <Grid container spacing={2}>
          {Object.keys(permissionsByModule)
            .sort()
            .map((moduleName) => {
              const modulePerms = permissionsByModule[moduleName];
              const allChecked = modulePerms.every((p) => selectedPermissionIds.includes(p.id));
              const someChecked = modulePerms.some((p) => selectedPermissionIds.includes(p.id));
              return (
                <Grid key={moduleName} size={{ xs: 12, sm: 6 }}>
                  <Box style={sx({ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 })}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={allChecked}
                          indeterminate={!allChecked && someChecked}
                          onChange={(e) => handleToggleModule(modulePerms, e.target.checked)}
                          disabled={readOnly}
                        />
                      }
                      label={
                        <Chip size="small" label={moduleName} style={sx({ textTransform: 'capitalize' })} />
                      }
                    />
                    <FormGroup style={sx({ pl: 3 })}>
                      {modulePerms.map((perm) => (
                        <FormControlLabel
                          key={perm.id}
                          control={
                            <Checkbox
                              size="small"
                              checked={selectedPermissionIds.includes(perm.id)}
                              onChange={() => handleTogglePermission(perm.id)}
                              disabled={readOnly}
                            />
                          }
                          label={
                            <Typography variant="body2">
                              {perm.action}
                              {perm.description && (
                                <Typography component="span" variant="caption" color="text.secondary" style={sx({ ml: 1 })}>
                                  {perm.description}
                                </Typography>
                              )}
                            </Typography>
                          }
                        />
                      ))}
                    </FormGroup>
                  </Box>
                </Grid>
              );
            })}
        </Grid>

        <Divider style={sx({ my: 3 })} />

        <Box style={sx({ display: 'flex', justifyContent: 'flex-end', gap: 2 })}>
          <Button variant="outlined" startIcon={<CancelIcon />} onClick={() => navigate('/roles')}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={submitting || readOnly}
          >
            {t('common.save', { defaultValue: 'Guardar' })}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default RolePermissionsPage;
