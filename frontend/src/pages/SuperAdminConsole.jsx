// FILE: frontend/src/pages/SuperAdminConsole.jsx
import { sx } from '../ui/sx';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Paper,
  Divider,
} from '@mui/material';
import { Settings as SettingsIcon, Shield as SecurityIcon, Users as UsersIcon, Building2 as BranchesIcon, Gavel as RolesIcon, Lock as PermissionsIcon, Shield as AuditIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const SuperAdminConsolePage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const adminCards = [
    {
      title: t('admin.branches'),
      icon: <BranchesIcon style={sx({ fontSize: 40 })} />,
      description: t('admin.branchesDesc'),
      path: '/branches',
      color: 'linear-gradient(135deg, #7847e3 0%, #8f6bf2 100%)',
    },
    {
      title: t('admin.users'),
      icon: <UsersIcon style={sx({ fontSize: 40 })} />,
      description: t('admin.usersDesc'),
      path: '/users',
      color: 'linear-gradient(135deg, #241046 0%, #7847e3 100%)',
    },
    {
      title: t('admin.roles'),
      icon: <RolesIcon style={sx({ fontSize: 40 })} />,
      description: t('admin.rolesDesc'),
      path: '/roles',
      color: 'linear-gradient(135deg, #ad93fb 0%, #6532c4 100%)',
    },
    {
      title: t('admin.permissions'),
      icon: <PermissionsIcon style={sx({ fontSize: 40 })} />,
      description: t('admin.permissionsDesc'),
      path: '/permissions',
      color: 'linear-gradient(135deg, #6532c4 0%, #241046 100%)',
    },
    {
      title: t('admin.settings'),
      icon: <SettingsIcon style={sx({ fontSize: 40 })} />,
      description: t('admin.settingsDesc'),
      path: '/settings',
      color: 'linear-gradient(135deg, #ad93fb 0%, #6532c4 100%)',
    },
    {
      title: t('admin.audit'),
      icon: <AuditIcon style={sx({ fontSize: 40 })} />,
      description: t('admin.auditDesc'),
      path: '/audit',
      color: 'linear-gradient(135deg, #8f6bf2 0%, #241046 100%)',
    },
    {
      title: t('admin.activity'),
      icon: <SecurityIcon style={sx({ fontSize: 40 })} />,
      description: t('admin.activityDesc'),
      path: '/activity',
      color: 'linear-gradient(135deg, #7847e3 0%, #241046 100%)',
    },
    // FIX (auditoria hallazgo medio M1): las tarjetas "Translations" y
    // "Backup" navegaban a /translations y /backup, rutas que no existen en
    // App.jsx, así que se eliminaron de la consola.
  ];

  return (
    <Box style={sx({ p: 3 })}>
      <Paper
        style={sx({
          p: 3,
          mb: 3,
          color: 'white',
          backgroundImage: 'linear-gradient(135deg, #2f1657 0%, #7847e3 45%, #6532c4 100%)',
          position: 'relative',
          overflow: 'hidden',
        })}
      >
        <Box
          style={sx({
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 95% 10%, rgba(255,255,255,0.12) 0%, transparent 45%)',
          })}
        />
        <Typography variant="h4" gutterBottom style={sx([{ position: 'relative' }, { fontWeight: 800 }])}>
          {t('admin.console')}
        </Typography>
        <Typography variant="body1" style={sx({ position: 'relative' })}>
          {t('admin.welcome')}, {user?.full_name}!
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        {adminCards.map((card) => (
          <Grid key={card.title} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card
              style={sx({
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 20px 50px rgba(58,28,118,0.16), 0 4px 16px rgba(58,28,118,0.08)' },
              })}
            >
              <CardContent style={sx({ flexGrow: 1 })}>
                <Box style={sx({ display: 'flex', alignItems: 'center', mb: 2 })}>
                  <Box
                    style={sx({
                      backgroundImage: card.color,
                      color: 'white',
                      borderRadius: 2,
                      p: 1,
                      mr: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    })}
                  >
                    {card.icon}
                  </Box>
                  <Typography variant="h6">{card.title}</Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  {card.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  color="primary"
                  onClick={() => navigate(card.path)}
                >
                  {t('common.view')}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper style={sx({ p: 3, mt: 3 })}>
        <Typography variant="h6" gutterBottom>
          {t('admin.systemInfo')}
        </Typography>
        <Divider style={sx({ mb: 2 })} />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="textSecondary">
              {t('admin.version')}
            </Typography>
            <Typography variant="body1">ACADEMIX 2.0</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="textSecondary">
              {t('admin.environment')}
            </Typography>
            <Typography variant="body1">
              {import.meta.env.MODE || 'development'}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="textSecondary">
              {t('admin.totalUsers')}
            </Typography>
            <Typography variant="body1">-</Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="body2" color="textSecondary">
              {t('admin.lastBackup')}
            </Typography>
            <Typography variant="body1">-</Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default SuperAdminConsolePage;