// FILE: frontend/src/features/calendar/pages/CalendarListPage.jsx
import { sx } from '../../../ui/sx';
import React, { useState, useEffect } from 'react';
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
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Grid,
} from '@mui/material';
import { Plus as AddIcon, Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon, Search as SearchIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import PermissionGate from '../../../components/PermissionGate';
import ListPageHeader from '../../../components/ListPageHeader';
import { usePermissions } from '../../../hooks/usePermissions';
import calendarApi from '../api';

const CalendarListPage = () => {
  const { t } = useTranslation();
  const [confirm, ConfirmDialog] = useConfirm();
  const navigate = useNavigate();
  const { canCreate } = usePermissions();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const columns = [
    { field: 'code', label: t('calendar.code'), sortable: true },
    { field: 'title', label: t('calendar.title'), sortable: true },
    {
      field: 'date',
      label: t('calendar.date'),
      type: 'date',
      sortable: true,
    },
    {
      field: 'event_type',
      label: t('calendar.eventType'),
      sortable: true,
      render: (value) => {
        const colors = {
          HOLIDAY: 'error',
          EXAM: 'warning',
          EVENT: 'primary',
          MEETING: 'info',
          DEADLINE: 'default',
          OTHER: 'default',
        };
        return <Chip label={value} color={colors[value] || 'default'} size="small" />;
      },
    },
    {
      field: 'is_holiday',
      label: t('calendar.holiday'),
      sortable: true,
      render: (value) => value ? t('common.yes') : t('common.no'),
    },
    {
      field: 'status',
      label: t('calendar.status'),
      type: 'status',
      sortable: true,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await calendarApi.getByMonth(year, month, {
        page: page + 1,
        pageSize,
      });
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data, total, page, pageSize }` envelope from the backend.
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, year, month]);

  const handleDelete = async (id) => {
    if (await confirm(t('common.confirmDelete'))) {
      try {
        await calendarApi.delete(id);
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
      onClick: (row) => navigate(`/calendar/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/calendar/${row.id}/edit`),
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
        <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('calendar.title')}</Typography>
      </Box>

      {/* Encabezado unico con ALTA RAPIDA: programar un evento del
          calendario escolar sin abandonar el listado. */}
      <div style={sx({ mt: -2 })}>
        <ListPageHeader
          title=""
          permission="calendar.create"
          createPath="/calendar/new"
          navigate={navigate}
          onSaved={loadData}
          quickCreate={{
            fields: [
              { name: 'title', label: t('calendar.title') || 'Titulo', required: true, maxLength: 150 },
              { name: 'date', label: t('calendar.date') || 'Fecha', type: 'date', required: true },
              { name: 'event_type', label: t('calendar.eventType') || 'Tipo', type: 'select', required: true, options: [{ value: 'HOLIDAY', label: 'Holiday' }, { value: 'EXAM', label: 'Exam' }, { value: 'MEETING', label: 'Meeting' }, { value: 'EVENT', label: 'Event' }, { value: 'OTHER', label: 'Other' }] },
              { name: 'description', label: t('calendar.description') || 'Descripcion', fullWidth: true, multiline: true, maxLength: 255 },
            ],
            onSubmit: (payload) => calendarApi.create(payload),
            title: t('calendar.add') || 'Nuevo evento',
            quickLabel: t('common.quickAdd') || 'Alta rapida',
          }}
        />
      </div>

      {/* Filtros de mes/año */}
      <Box style={sx({ mb: 3 })}>
        <Grid container spacing={2} style={sx({ alignItems: 'center' })}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              label={t('calendar.year')}
              type="number"
              value={year}
              onChange={(e) => {
                setPage(0);
                setYear(parseInt(e.target.value) || new Date().getFullYear());
              }}
              slotProps={{ input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControl fullWidth>
              <InputLabel>{t('calendar.month')}</InputLabel>
              <Select
                value={month}
                onChange={(e) => {
                  setPage(0);
                  setMonth(parseInt(e.target.value));
                }}
                label={t('calendar.month')}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <MenuItem key={m} value={m}>
                    {new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Button variant="outlined" onClick={loadData} fullWidth>
              {t('common.filter')}
            </Button>
          </Grid>
        </Grid>
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
        onRowClick={(row) => navigate(`/calendar/${row.id}`)}
        rowActions={rowActions}
        searchPlaceholder={t('calendar.search')}
        emptyMessage={t('calendar.noData')}
        showSearch={false}
      />
    {ConfirmDialog}
    </Box>
  );
};

export default CalendarListPage;