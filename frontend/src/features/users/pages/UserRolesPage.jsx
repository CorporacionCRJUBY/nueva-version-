// FILE: frontend/src/features/users/pages/UserRolesPage.jsx
import { sx } from '../../../ui/sx';
import React, { useState, useEffect } from 'react';
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
import { Save as SaveIcon, XCircle as CancelIcon, Gavel as RolesIcon } from 'lucide-react';
import usersApi from '../api';
import rolesApi from '../../roles/api';
import { useAuth } from '../../../hooks/useAuth';

const UserRolesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { user: currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [targetUser, setTargetUser] = useState(null);
  const [allRoles, setAllRoles] = useState([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);

  // El backend rechaza que un usuario modifique sus propios roles (evita
  // que alguien con `users.edit` se autoasigne un rol más privilegiado),
  // así que la pantalla lo deshabilita también del lado del cliente.
  const isEditingSelf = currentUser && Number(currentUser.id) === Number(id);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, rolesRes, assignedRes] = await Promise.all([
        usersApi.getById(id),
        rolesApi.getAll({ pageSize: 1000 }),
        usersApi.getRoles(id),
      ]);
      // `api.get` unwraps axios' response.data, así que cada `Res` aquí es
      // el envelope `{ success, data, ... }` del backend.
      setTargetUser(userRes?.data || userRes);
      setAllRoles(rolesRes?.data || []);
      const assigned = assignedRes?.data || [];
      setSelectedRoleIds(assigned.map((r) => r.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = (roleId) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((rid) => rid !== roleId) : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await usersApi.assignRoles(id, selectedRoleIds);
      navigate('/users');
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
        <RolesIcon color="primary" />
        <Typography variant="h5" style={sx({ fontWeight: 600 })}>
          {t('users.assignRoles', { defaultValue: 'Asignar roles' })}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" style={sx({ mb: 2 })}>
          {error}
        </Alert>
      )}

      {isEditingSelf && (
        <Alert severity="warning" style={sx({ mb: 2 })}>
          {t('users.cannotEditOwnRoles', {
            defaultValue: 'No puede modificar sus propios roles.',
          })}
        </Alert>
      )}

      <Paper style={sx({ p: 3 })}>
        {targetUser && (
          <>
            <Typography variant="subtitle1" style={sx({ fontWeight: 600 })}>
              {targetUser.full_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" style={sx({ mb: 1 })}>
              {targetUser.email}
            </Typography>
            <Box style={sx({ mb: 2 })}>
              {selectedRoleIds.length === 0 && (
                <Chip
                  size="small"
                  label={t('users.noRolesAssigned', { defaultValue: 'Sin roles asignados' })}
                  variant="outlined"
                />
              )}
              {allRoles
                .filter((r) => selectedRoleIds.includes(r.id))
                .map((r) => (
                  <Chip key={r.id} size="small" label={r.name} color="primary" style={sx({ mr: 1, mb: 1 })} />
                ))}
            </Box>
            <Divider style={sx({ mb: 2 })} />
          </>
        )}

        <Typography variant="subtitle2" style={sx({ mb: 1 })}>
          {t('users.availableRoles', { defaultValue: 'Roles disponibles' })}
        </Typography>

        <Grid container spacing={1}>
          <Grid size={{ xs: 12 }}>
            <FormGroup>
              {allRoles.map((role) => (
                <FormControlLabel
                  key={role.id}
                  control={
                    <Checkbox
                      checked={selectedRoleIds.includes(role.id)}
                      onChange={() => handleToggleRole(role.id)}
                      disabled={isEditingSelf}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" component="span" style={sx({ fontWeight: 500 })}>
                        {role.name}
                      </Typography>
                      {role.description && (
                        <Typography variant="caption" color="text.secondary" style={sx({ ml: 1 })}>
                          {role.description}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </Grid>
        </Grid>

        <Divider style={sx({ my: 3 })} />

        <Box style={sx({ display: 'flex', justifyContent: 'flex-end', gap: 2 })}>
          <Button variant="outlined" startIcon={<CancelIcon />} onClick={() => navigate('/users')}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={submitting || isEditingSelf}
          >
            {t('common.save', { defaultValue: 'Guardar' })}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default UserRolesPage;
