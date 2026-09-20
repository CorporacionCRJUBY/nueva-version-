// FILE: frontend/src/features/medicalRecords/pages/MedicalRecordListPage.jsx
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
import { Plus as AddIcon, Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon, HeartPulse as MedicalIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import PermissionGate from '../../../components/PermissionGate';
import ListPageHeader from '../../../components/ListPageHeader';
import studentsApi from '../../students/api';
import { usePermissions } from '../../../hooks/usePermissions';
import medicalRecordsApi from '../api';

const MedicalRecordListPage = () => {
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
  const [hasAllergyFilter, setHasAllergyFilter] = useState('');
  const searchDebounceRef = useRef(null);

  const columns = [
    { field: 'code', label: t('medicalRecords.code'), sortable: true },
    {
      field: 'student_id',
      label: t('medicalRecords.student'),
      sortable: true,
      render: (value, row) => row.student_name || `Student ${value}`,
    },
    {
      field: 'medical_condition',
      label: t('medicalRecords.condition'),
      sortable: true,
      render: (value) => value || '-',
    },
    {
      field: 'allergies',
      label: t('medicalRecords.allergies'),
      sortable: true,
      render: (value) => value ? 
        <Chip label={t('common.yes')} color="warning" size="small" /> : 
        <Chip label={t('common.no')} color="default" size="small" />,
    },
    {
      field: 'emergency_contact_name',
      label: t('medicalRecords.emergencyContact'),
      sortable: true,
      render: (value) => value || '-',
    },
    {
      field: 'last_checkup_date',
      label: t('medicalRecords.lastCheckup'),
      type: 'date',
      sortable: true,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await medicalRecordsApi.getAll({
        page: page + 1,
        pageSize,
        search: search || undefined,
        hasAllergy: hasAllergyFilter || undefined,
      });
      // `api.get` unwraps axios' response.data, so `response` here is the
      // `{ success, data, total, page, pageSize }` envelope from the backend.
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading medical records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, hasAllergyFilter]);

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
    if (name === 'hasAllergy') {
      setPage(0);
      setHasAllergyFilter(value);
    }
  };

  const handleDelete = async (id) => {
    if (await confirm(t('common.confirmDelete'))) {
      try {
        await medicalRecordsApi.delete(id);
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
      onClick: (row) => navigate(`/medical-records/${row.id}`),
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/medical-records/${row.id}/edit`),
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
        <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('medicalRecords.title')}</Typography>
      </Box>

      {/* Encabezado unico con ALTA RAPIDA: la ficha medica es un dato
          critico de seguridad y debe poder registrarse al instante. */}
      <div style={sx({ mt: -2 })}>
        <ListPageHeader
          title=""
          permission="medical-records.create"
          createPath="/medical-records/new"
          navigate={navigate}
          onSaved={loadData}
          quickCreate={{
            fields: [
              { name: 'student_id', label: t('medicalRecords.student') || 'Estudiante', type: 'select', required: true, fullWidth: true, options: students.map((s) => ({ value: String(s.id), label: `${s.first_name || ''} ${s.last_name || ''}`.trim() || s.code })) },
              { name: 'allergies', label: t('medicalRecords.allergies') || 'Alergias', fullWidth: true, multiline: true, maxLength: 255 },
              { name: 'medical_condition', label: t('medicalRecords.condition') || 'Condicion', fullWidth: true, multiline: true, maxLength: 255 },
              { name: 'emergency_contact_name', label: t('medicalRecords.emergencyContact') || 'Contacto de emergencia', maxLength: 100 },
              { name: 'emergency_contact_phone', label: t('medicalRecords.emergencyPhone') || 'Telefono de emergencia', type: 'tel', maxLength: 20 },
            ],
            onOpen: async () => {
              if (students.length) return;
              const res = await studentsApi.getAll({ pageSize: 100 });
              setStudents(res?.data || []);
            },
            onSubmit: (payload) => medicalRecordsApi.create(payload),
            title: t('medicalRecords.add') || 'Nueva ficha medica',
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
        onRowClick={(row) => navigate(`/medical-records/${row.id}`)}
        rowActions={rowActions}
        searchPlaceholder={t('medicalRecords.search')}
        emptyMessage={t('medicalRecords.noData')}
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        filterValues={{ hasAllergy: hasAllergyFilter }}
        filterFields={[
          {
            name: 'hasAllergy',
            label: t('medicalRecords.hasAllergy'),
            options: [
              { value: 'true', label: t('common.yes') },
              { value: 'false', label: t('common.no') },
            ],
          },
        ]}
      />
    {ConfirmDialog}
    </Box>
  );
};

export default MedicalRecordListPage;