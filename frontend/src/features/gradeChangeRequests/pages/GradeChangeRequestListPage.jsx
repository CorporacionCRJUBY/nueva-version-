// FILE: frontend/src/features/gradeChangeRequests/pages/GradeChangeRequestListPage.jsx
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { Plus as AddIcon, Eye as ViewIcon, Pencil as EditIcon, Trash2 as DeleteIcon, CheckCircle2 as ApproveIcon, XCircle as RejectIcon } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import PermissionGate from '../../../components/PermissionGate';
import { usePermissions } from '../../../hooks/usePermissions';
import gradeChangeRequestsApi from '../api';

const GradeChangeRequestListPage = () => {
  const { t } = useTranslation();
  const [confirm, ConfirmDialog] = useConfirm();
  const navigate = useNavigate();
  const { canCreate } = usePermissions();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [reviewDialog, setReviewDialog] = useState({ open: false, id: null, action: null });
  const [reviewNotes, setReviewNotes] = useState('');

  const columns = [
    { field: 'code', label: t('gradeChangeRequests.code'), sortable: true },
    {
      field: 'student_id',
      label: t('gradeChangeRequests.student'),
      sortable: true,
      render: (value, row) => row.student_name || `Student ${value}`,
    },
    {
      field: 'current_grade',
      label: t('gradeChangeRequests.current'),
      sortable: true,
    },
    {
      field: 'requested_grade',
      label: t('gradeChangeRequests.requested'),
      sortable: true,
    },
    {
      field: 'status',
      label: t('gradeChangeRequests.status'),
      type: 'status',
      sortable: true,
    },
    {
      field: 'created_at',
      label: t('gradeChangeRequests.requestedAt'),
      type: 'datetime',
      sortable: true,
    },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await gradeChangeRequestsApi.getAll({
        page: page + 1,
        pageSize,
      });
      setData(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading grade change requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, pageSize]);

  const handleDelete = async (id) => {
    if (await confirm(t('common.confirmDelete'))) {
      try {
        await gradeChangeRequestsApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const handleReview = async (id, action) => {
    setReviewDialog({ open: true, id, action });
    setReviewNotes('');
  };

  const handleReviewSubmit = async () => {
    const { id, action } = reviewDialog;
    try {
      if (action === 'approve') {
        await gradeChangeRequestsApi.approve(id, { notes: reviewNotes });
      } else {
        await gradeChangeRequestsApi.reject(id, { notes: reviewNotes });
      }
      setReviewDialog({ open: false, id: null, action: null });
      loadData();
    } catch (error) {
      console.error('Error reviewing request:', error);
    }
  };

  const rowActions = [
    {
      label: t('common.view'),
      icon: <ViewIcon fontSize="small" />,
      onClick: (row) => navigate(`/grade-change-requests/${row.id}`),
    },
    {
      label: t('gradeChangeRequests.approve'),
      icon: <ApproveIcon fontSize="small" color="success" />,
      onClick: (row) => handleReview(row.id, 'approve'),
      show: (row) => row.status === 'PENDING',
    },
    {
      label: t('gradeChangeRequests.reject'),
      icon: <RejectIcon fontSize="small" color="error" />,
      onClick: (row) => handleReview(row.id, 'reject'),
      show: (row) => row.status === 'PENDING',
    },
    {
      label: t('common.edit'),
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => navigate(`/grade-change-requests/${row.id}/edit`),
      show: (row) => row.status === 'PENDING',
    },
    {
      label: t('common.delete'),
      icon: <DeleteIcon fontSize="small" color="error" />,
      onClick: (row) => handleDelete(row.id),
      show: (row) => row.status === 'PENDING',
    },
  ];

  return (
    <Box style={sx({ p: 3 })}>
      <Box style={sx({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: '1px solid', borderColor: 'divider' })}>
        <Typography variant="h4" className="gradient-text" style={sx({ fontWeight: 800 })}>{t('gradeChangeRequests.title')}</Typography>
        <PermissionGate permission="grade-change-requests.create">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/grade-change-requests/new')}
          >
            {t('gradeChangeRequests.add')}
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
        onRowClick={(row) => navigate(`/grade-change-requests/${row.id}`)}
        rowActions={rowActions}
        searchPlaceholder={t('gradeChangeRequests.search')}
        emptyMessage={t('gradeChangeRequests.noData')}
        filterFields={[
          {
            name: 'status',
            label: t('gradeChangeRequests.status'),
            options: [
              { value: 'PENDING', label: t('status.pending') },
              { value: 'APPROVED', label: t('status.approved') },
              { value: 'REJECTED', label: t('status.rejected') },
            ],
          },
        ]}
      />

      <Dialog open={reviewDialog.open} onClose={() => setReviewDialog({ open: false, id: null, action: null })}>
        <DialogTitle>
          {reviewDialog.action === 'approve' ? t('gradeChangeRequests.approveTitle') : t('gradeChangeRequests.rejectTitle')}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('gradeChangeRequests.reviewNotes')}
            fullWidth
            multiline
            rows={4}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog({ open: false, id: null, action: null })}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleReviewSubmit} variant="contained" color={reviewDialog.action === 'approve' ? 'success' : 'error'}>
            {reviewDialog.action === 'approve' ? t('common.approve') : t('common.reject')}
          </Button>
        </DialogActions>
      </Dialog>
    {ConfirmDialog}
    </Box>
  );
};

export default GradeChangeRequestListPage;