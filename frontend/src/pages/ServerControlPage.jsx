// FILE: frontend/src/pages/ServerControlPage.jsx
import { sx } from '../ui/sx';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  LinearProgress,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
} from '@mui/material';
// Nota (QA): la página usaba `DnsIcon` y `CheckCircle` sin importarlos
// (ReferenceError en tiempo de ejecución: la página quedaba en blanco). `Dns`
// además no existe en esta versión de lucide-react, se usa `Network`.
import { MemoryStick as MemoryIcon, HardDrive as DiskIcon, Cpu as CpuIcon, Timer as UptimeIcon, RefreshCw as RefreshIcon, RotateCcw as RestartIcon, Terminal as LogsIcon, Check as CheckIcon, CheckCircle, AlertOctagon as ErrorIcon, CloudUpload as CloudIcon, Server as ServerIcon, HardDrive as StorageIcon, Network as DnsIcon } from 'lucide-react';
import { api } from '../api/axiosClient';

const POLL_INTERVAL_MS = 5000;

const ServerControlPage = () => {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState(null);
  const [services, setServices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restarting, setRestarting] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const pollRef = useRef(null);

  const loadAll = useCallback(async () => {
    try {
      const [metricsRes, servicesRes, logsRes] = await Promise.allSettled([
        api.get('/system/metrics'),
        api.get('/system/services'),
        api.get('/system/logs', { params: { lines: 200 } }),
      ]);

      if (metricsRes.status === 'fulfilled') setMetrics(metricsRes.value?.data);
      if (servicesRes.status === 'fulfilled') setServices(servicesRes.value?.data || []);
      if (logsRes.status === 'fulfilled') setLogs(logsRes.value?.data?.lines || []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message || 'Error loading system data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    pollRef.current = setInterval(loadAll, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadAll]);

  const handleRestart = async (service) => {
    setRestarting(service);
    try {
      await api.post('/system/restart', { service });
      // Recargar tras un momento
      setTimeout(loadAll, 2000);
    } catch (err) {
      setError(err.message || 'Error restarting service');
    } finally {
      setRestarting(null);
    }
  };

  const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${value.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`;
  };

  const formatUptime = (secs) => {
    if (!secs) return '-';
    const days = Math.floor(secs / 86400);
    const hours = Math.floor((secs % 86400) / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  // El color del medidor sigue el mismo umbral de siempre (60/85), pero
  // devolviendo clases de Tailwind en lugar de la prop `color` de MUI.
  const gaugeClass = (percent) => {
    if (percent < 60) return 'bg-success';
    if (percent < 85) return 'bg-warning';
    return 'bg-danger';
  };

  const metricCards = [
    {
      title: t('serverControl.cpu'),
      value: metrics ? `${metrics.cpu?.percent ?? 0}%` : '-',
      icon: <CpuIcon style={sx({ fontSize: 40 })} />,
      color: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
      progress: metrics?.cpu?.percent ?? 0,
      detail: metrics ? `${metrics.cpu?.cores ?? 0} cores` : '',
    },
    {
      title: t('serverControl.memory'),
      value: metrics ? `${metrics.memory?.usedPercent ?? 0}%` : '-',
      icon: <MemoryIcon style={sx({ fontSize: 40 })} />,
      color: 'linear-gradient(135deg, #1e1b4b 0%, #7c3aed 100%)',
      progress: metrics?.memory?.usedPercent ?? 0,
      detail: metrics ? `${formatBytes(metrics.memory?.used)} / ${formatBytes(metrics.memory?.total)}` : '',
    },
    {
      title: t('serverControl.disk'),
      value: metrics ? `${metrics.disk?.usedPercent ?? 0}%` : '-',
      icon: <DiskIcon style={sx({ fontSize: 40 })} />,
      color: 'linear-gradient(135deg, #a78bfa 0%, #c4b5fd 100%)',
      progress: metrics?.disk?.usedPercent ?? 0,
      detail: metrics ? `${formatBytes(metrics.disk?.used)} / ${formatBytes(metrics.disk?.total)}` : '',
    },
    {
      title: t('serverControl.uptime'),
      value: metrics ? formatUptime(metrics.uptime?.raw) : '-',
      icon: <UptimeIcon style={sx({ fontSize: 40 })} />,
      color: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)',
      // Sin medidor: el uptime es una DURACIÓN, no un porcentaje. Antes se
      // pintaba una barra al 100% que no significaba nada.
      progress: null,
      detail: metrics ? `${metrics.hostname} · ${metrics.platform}` : '',
    },
  ];

  return (
    <Box>
      {/* Encabezado */}
      <Paper
        style={sx({
          p: 3,
          mb: 3,
          color: 'white',
          backgroundImage: 'linear-gradient(135deg, #2d1b69 0%, #7c3aed 45%, #6d28d9 100%)',
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
        <Box style={sx({ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 })}>
          <Box>
            <Typography variant="h4" gutterBottom style={sx({ fontWeight: 800 })}>
              {t('serverControl.title')}
            </Typography>
            <Typography variant="body1" style={sx({ opacity: 0.9 })}>
              {t('serverControl.subtitle')}
            </Typography>
          </Box>
          <Box style={sx({ display: 'flex', alignItems: 'center', gap: 1 })}>
            {lastUpdated && (
              <Typography variant="caption" style={sx({ opacity: 0.8, mr: 1 })}>
                {t('serverControl.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
              </Typography>
            )}
            <Tooltip title={t('common.refresh')}>
              <IconButton
                onClick={loadAll}
                disabled={loading}
                style={sx({ color: '#fff', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' } })}
              >
                <RefreshIcon style={sx({ animation: loading ? 'spin 1s linear infinite' : 'none' })} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" style={sx({ mb: 3 })} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && !metrics ? (
        <LinearProgress />
      ) : (
        <>
          {/* Métricas */}
          <Grid container spacing={3} style={sx({ mb: 3 })}>
            {metricCards.map((card) => (
              <Grid key={card.title} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card
                  style={sx({
                    height: '100%',
                    position: 'relative',
                    overflow: 'visible',
                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 20px 50px rgba(58,28,118,0.16), 0 4px 16px rgba(58,28,118,0.08)' },
                    border: '1px solid',
                    borderColor: '#ddd6fe',
                    backgroundImage: 'none',
                    backgroundColor: '#ffffff',
                    borderRadius: 3,
                  })}
                >
                  <CardContent style={sx({ p: 2.5, '&:last-child': { pb: 2.5 } })}>
                    <Box style={sx({ position: 'relative' })}>
                      <Box
                        style={sx({
                          position: 'absolute',
                          top: -1,
                          left: -1,
                          right: -1,
                          height: 4,
                          backgroundImage: card.color,
                          borderRadius: '18px 18px 0 0',
                        })}
                      />
                      <Box style={sx({ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mt: 0.5 })}>
                        <Box style={sx({ minWidth: 0 })}>
                          <Typography variant="h4" component="div" style={sx({ fontSize: '1.5rem', lineHeight: 1.1, fontWeight: 800 })}>
                            {card.value}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" style={sx({ mt: 0.5, opacity: 0.85, fontWeight: 500 })}>
                            {card.title}
                          </Typography>
                          {card.detail && (
                            <Typography variant="caption" color="textSecondary" style={sx({ display: 'block', mt: 0.5, opacity: 0.7 })}>
                              {card.detail}
                            </Typography>
                          )}
                        </Box>
                        <Box
                          style={sx({
                            width: 52,
                            height: 52,
                            borderRadius: '14px',
                            backgroundImage: card.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 14px rgba(30,27,75,0.3)',
                          })}
                        >
                          {card.icon}
                        </Box>
                      </Box>
                      {card.progress !== undefined && card.progress !== null && (
                        <Box style={sx({ mt: 2 })}>
                          {/* Barra nativa de Tailwind.
                              FIX (QA): se usaba `LinearProgress` de MUI y sus
                              barras medían siempre el 100% del ancho fuera
                              cual fuera el valor (18%, 26% y 68% se veían
                              idénticas), tanto vía Docker como en local. Con
                              un ancho en % el valor mostrado y el dibujado ya
                              no pueden divergir. */}
                          <div
                            className="h-2 w-full overflow-hidden rounded-full bg-line"
                            role="progressbar"
                            aria-valuenow={Math.round(card.progress)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={card.title}
                            data-testid="metric-gauge"
                          >
                            <div
                              className={`h-full rounded-full transition-[width] duration-500 ease-smooth ${gaugeClass(
                                card.progress
                              )}`}
                              style={{
                                width: `${Math.min(100, Math.max(0, Number(card.progress) || 0))}%`,
                              }}
                            />
                          </div>
                        </Box>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3}>
            {/* Servicios */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper style={sx({ p: 2 })}>
                <Box style={sx({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 })}>
                  <Typography variant="h6" style={sx({ fontWeight: 700 })}>
                    {t('serverControl.services')}
                  </Typography>
                  <DnsIcon color="primary" />
                </Box>
                <Divider style={sx({ mb: 2 })} />
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t('serverControl.service')}</TableCell>
                        <TableCell>{t('serverControl.status')}</TableCell>
                        <TableCell align="right">{t('serverControl.actions')}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {services.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} align="center" style={sx({ py: 3 })}>
                            <Typography color="textSecondary">{t('common.noData')}</Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        services.map((svc) => (
                          <TableRow key={svc.name}>
                            <TableCell>
                              <Box style={sx({ display: 'flex', alignItems: 'center', gap: 1 })}>
                                <StorageIcon fontSize="small" color="primary" />
                                <Box>
                                  <Typography variant="body2" style={sx({ fontWeight: 600 })}>
                                    {svc.label}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    {svc.name}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={svc.status === 'running' ? t('serverControl.running') : svc.status === 'down' ? t('serverControl.down') : svc.status}
                                size="small"
                                color={svc.status === 'running' ? 'success' : svc.status === 'down' ? 'error' : 'default'}
                                icon={svc.status === 'running' ? <CheckCircle /> : svc.status === 'down' ? <ErrorIcon /> : undefined}
                              />
                            </TableCell>
                            <TableCell align="right">
                              {svc.name === 'backend' && (
                                <Tooltip title={t('serverControl.restart')}>
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleRestart('backend')}
                                    disabled={restarting === 'backend'}
                                  >
                                    {restarting === 'backend' ? <CircularProgress size={18} /> : <RestartIcon />}
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            {/* Logs */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper style={sx({ p: 2 })}>
                <Box style={sx({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 })}>
                  <Typography variant="h6" style={sx({ fontWeight: 700 })}>
                    {t('serverControl.logs')}
                  </Typography>
                  <LogsIcon color="primary" />
                </Box>
                <Divider style={sx({ mb: 2 })} />
                <Box
                  style={sx({
                    maxHeight: 320,
                    overflow: 'auto',
                    bgcolor: '#1e1b4b',
                    color: '#c4b5fd',
                    borderRadius: 2,
                    p: 2,
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: '0.75rem',
                    lineHeight: 1.6,
                  })}
                >
                  {logs.length === 0 ? (
                    <Typography color="textSecondary" align="center" style={sx({ py: 4 })}>
                      {t('common.noData')}
                    </Typography>
                  ) : (
                    logs.map((line, i) => (
                      <Box key={i} style={sx({ whiteSpace: 'pre-wrap', wordBreak: 'break-word' })}>
                        {line}
                      </Box>
                    ))
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default ServerControlPage;