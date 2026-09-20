// FILE: frontend/src/features/attendance/pages/AttendanceListPage.jsx
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
import { Plus as AddIcon, Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon, CalendarDays as CalendarIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import PermissionGate from '../../../components/PermissionGate';
import { usePermissions } from '../../../hooks/usePermissions';
import attendanceApi from '../api';

const AttendanceListPage = () => {
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

  const columns = [
    { field: 'code', label: t('attendance.code'), sortable: true },
    {
      field: 'student_id',
      label: t('attendance.student'),
      sortable: true,
      render: (value, row) => row.student_name || `Student ${value}`,
    },
    {
      field: 'assignment_id',
      label: t('attendance.assignment'),
      sortable: true,
      render: (value, row) => row.assignment_name || `Assignment ${value}`,
    },
    {
      field: 'date',
      label: t('attendance.date'),
      type: 'date',
      sortable: true,
    },
    {
      field: 'status',
      label: t('attendance.status'),
      type: 'status',
      sortable: true,
    },
    {
      field: 'check_in_time',
      label: t('attendance.checkIn'),
      sortable: true,
      render: (value) => value || '-',
    },
    {
      field: 'check_out_time',
      label: t('attendance.checkOut'),
      sortable: true,
      render: (value) => value || '-',
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await attendanceApi.getAll({
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
      console.error('Error loading attendance:', error);
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
        await attendanceApi.delete(id);
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
      onClick: (row) => navigate(`/attendance/${row.id}`),
    },
    {
      label: t('attendance.monthlyGrid'),
      icon: <CalendarIcon fontSize="small" />,
      onClick: (row) => navigate(`/attendance/monthly/${row.assignment_id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/attendance/${row.id}/edit`),
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
        <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('attendance.title')}</Typography>
        <PermissionGate permission="attendance.create">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/attendance/new')}
          >
            {t('attendance.add')}
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
        onRowClick={(row) => navigate(`/attendance/${row.id}`)}
        rowActions={rowActions}
        searchPlaceholder={t('attendance.search')}
        emptyMessage={t('attendance.noData')}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        filterValues={{ status: statusFilter }}
        filterFields={[
          {
            name: 'status',
            label: t('attendance.status'),
            options: [
              { value: 'P', label: t('attendance.present') },
              { value: 'O', label: t('attendance.online') },
              { value: 'E', label: t('attendance.excused') },
              { value: 'U', label: t('attendance.unexcused') },
            ],
          },
        ]}
      />
    {ConfirmDialog}
    </Box>
  );
};

export default AttendanceListPage;