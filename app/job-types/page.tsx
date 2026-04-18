'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DataGrid, 
  GridColDef, 
  GridRowSelectionModel,
  GridToolbar,
  GridActionsCellItem,
  GridRowId
} from '@mui/x-data-grid';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  TextField, 
  Button,
  CircularProgress, 
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Add as AddIcon,
  Close as CloseIcon
} from '@mui/icons-material';

export default function JobTypes() {
  const queryClient = useQueryClient();
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingJobType, setEditingJobType] = useState<any>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as any });

  const { data: jobTypesData, isLoading: jobTypesLoading, error: jobTypesError } = useQuery({
    queryKey: ['jobTypes'],
    queryFn: async () => {
      const response = await fetch('/api/job-types');
      if (!response.ok) throw new Error('Failed to fetch job types');
      return response.json();
    }
  });

  // Mutations
  const updateJobTypeMutation = useMutation({
    mutationFn: async (updatedJobType: any) => {
      const response = await fetch(`/api/job-types/${updatedJobType._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedJobType),
      });
      if (!response.ok) throw new Error('Failed to update job type');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobTypes'] });
      setSnackbar({ open: true, message: 'Job type updated successfully', severity: 'success' });
      setEditDialogOpen(false);
      setEditingJobType(null);
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: 'Failed to update job type', severity: 'error' });
    },
  });

  const createJobTypeMutation = useMutation({
    mutationFn: async (newJobType: any) => {
      const response = await fetch('/api/job-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJobType),
      });
      if (!response.ok) throw new Error('Failed to create job type');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobTypes'] });
      setSnackbar({ open: true, message: 'Job type created successfully', severity: 'success' });
      setEditDialogOpen(false);
      setEditingJobType(null);
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: 'Failed to create job type', severity: 'error' });
    },
  });

  const deleteJobTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/job-types/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete job type');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobTypes'] });
      setSnackbar({ open: true, message: 'Job type deleted successfully', severity: 'success' });
      setSelectionModel([]);
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: 'Failed to delete job type', severity: 'error' });
    },
  });

  const isSaving = (updateJobTypeMutation as any)?.isPending || (createJobTypeMutation as any)?.isPending;

  const handleEdit = useCallback((id: GridRowId) => {
    const jobType = jobTypesData?.find((j: any) => j._id === id);
    setEditingJobType(jobType);
    setEditDialogOpen(true);
  }, [jobTypesData]);

  const handleDelete = useCallback((id: GridRowId) => {
    if (window.confirm('Are you sure you want to delete this job type?')) {
      deleteJobTypeMutation.mutate(id as string);
    }
  }, [deleteJobTypeMutation]);

  const handleAddNew = () => {
    setEditingJobType({
      name: '',
      description: '',
      isActive: true
    });
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    if (editingJobType._id) {
      updateJobTypeMutation.mutate(editingJobType);
    } else {
      createJobTypeMutation.mutate(editingJobType);
    }
  };

  // Generate columns
  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Name",
      width: 300,
      editable: false,
    },
    {
      field: "description",
      headerName: "Description",
      width: 400,
      editable: false,
    },
    {
      field: "isActive",
      headerName: "Status",
      width: 120,
      editable: false,
      renderCell: (params) => (
        <span className={params.value ? 'pill pill--mint' : 'pill pill--muted'}>
          {params.value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleEdit(params.id)}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => handleDelete(params.id)}
        />,
      ],
    },
  ];

  // Transform data for DataGrid
  const rows = jobTypesData?.map((jobType: any) => ({
    ...jobType,
    id: jobType._id,
  })) || [];

  if (jobTypesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (jobTypesError) {
    return (
      <Alert severity="error">
        Failed to load job types data. Please try refreshing the page.
      </Alert>
    );
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Job types management
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddNew}
            >
              Add new job type
            </Button>
          </Box>

          <Box sx={{ height: "calc(100vh - 300px)", width: "100%" }}>
            <DataGrid
              rows={rows}
              columns={columns}
              getRowId={(row) => row._id}
              loading={jobTypesLoading}
              pagination
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[10, 25, 50, 100]}
              checkboxSelection
              disableRowSelectionOnClick
              rowSelectionModel={selectionModel}
              onRowSelectionModelChange={setSelectionModel}
              slots={{
                toolbar: GridToolbar,
              }}
              slotProps={{
                toolbar: {
                  showQuickFilter: true,
                  quickFilterProps: { debounceMs: 500 },
                },
              }}
              sx={{
                '& .MuiDataGrid-row.Mui-selected': {
                  backgroundColor: 'var(--xz-teal-50)',
                },
                '& .MuiDataGrid-row.Mui-selected:hover': {
                  backgroundColor: 'var(--xz-teal-50)',
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {editingJobType?._id ? 'Edit job type' : 'Add new job type'}
            </Typography>
            <IconButton onClick={() => setEditDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {editingJobType && (
            <Box sx={{ display: 'grid', gap: 2, pt: 1 }}>
              <TextField
                label="Name"
                value={editingJobType.name || ''}
                onChange={(e) => setEditingJobType({ ...editingJobType, name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Description"
                value={editingJobType.description || ''}
                onChange={(e) => setEditingJobType({ ...editingJobType, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
              />
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editingJobType.isActive !== undefined ? editingJobType.isActive : true}
                  onChange={(e) => setEditingJobType({ ...editingJobType, isActive: e.target.value as boolean })}
                  label="Status"
                >
                  <MenuItem value={true as any}>Active</MenuItem>
                  <MenuItem value={false as any}>Inactive</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={isSaving || !editingJobType?.name}
          >
            {isSaving ? <><CircularProgress size={18} sx={{ mr: 1, color: 'inherit' }} /> Saving…</> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
