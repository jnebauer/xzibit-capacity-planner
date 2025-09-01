'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  CircularProgress, 
  Alert,
  Chip,
  Paper,
  Divider,
  Grid,
  IconButton,
  Avatar
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon,
  Build as BuildIcon,
  Event as EventIcon
} from '@mui/icons-material';

export default function EmployeeView() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      const response = await fetch(`/api/staff/${employeeId}`);
      if (!response.ok) throw new Error('Failed to fetch employee');
      return response.json();
    },
    enabled: !!employeeId
  });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !employee) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load employee. Please try refreshing the page.
        </Alert>
      </Box>
    );
  }

  const handleEdit = () => {
    router.push(`/employees/edit/${employeeId}`);
  };

  const handleBack = () => {
    router.push('/employees');
  };

  const getSkillLevel = (skill: string) => {
    if (!employee.skills || !employee.skills[skill]) return 'Not Available';
    const level = employee.skills[skill];
    if (level >= 0.9) return 'Expert';
    if (level >= 0.7) return 'Advanced';
    if (level >= 0.5) return 'Intermediate';
    if (level >= 0.3) return 'Beginner';
    return 'Novice';
  };

  const getSkillColor = (skill: string) => {
    if (!employee.skills || !employee.skills[skill]) return 'default';
    const level = employee.skills[skill];
    if (level >= 0.9) return 'success';
    if (level >= 0.7) return 'primary';
    if (level >= 0.5) return 'warning';
    if (level >= 0.3) return 'info';
    return 'default';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={handleBack} sx={{ color: '#667eea' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#2c3e50' }}>
            Employee Details
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={handleEdit}
            sx={{
              borderColor: '#667eea',
              color: '#667eea',
              '&:hover': {
                borderColor: '#5a6fd8',
                backgroundColor: 'rgba(102, 126, 234, 0.08)'
              }
            }}
          >
            Edit Employee
          </Button>
          <Button
            variant="contained"
            startIcon={<WorkIcon />}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
              }
            }}
          >
            View Schedule
          </Button>
        </Box>
      </Box>

      {/* Employee Overview Card */}
      <Card sx={{ mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
            <Avatar
              sx={{ 
                width: 80, 
                height: 80, 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontSize: '2rem'
              }}
            >
              {employee.name ? employee.name.charAt(0).toUpperCase() : 'E'}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: '#2c3e50', mb: 1 }}>
                {employee.name || 'Unnamed Employee'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                {employee.role && (
                  <Chip 
                    label={employee.role} 
                    color="primary" 
                    variant="outlined" 
                    size="small"
                  />
                )}
                {employee.department && (
                  <Chip 
                    label={employee.department} 
                    color="secondary" 
                    variant="outlined" 
                    size="small"
                  />
                )}
                <Chip 
                  label={`${(employee.utilisation || 0.85) * 100}% Utilisation`}
                  color={employee.utilisation >= 0.9 ? "success" : employee.utilisation >= 0.8 ? "warning" : "info"}
                  variant="outlined" 
                  size="small"
                />
              </Box>
              <Typography variant="body1" sx={{ color: '#7f8c8d' }}>
                {employee.email || 'No email provided'}
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: 2, backgroundColor: '#f8f9fa' }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#2c3e50', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ScheduleIcon color="primary" />
                  Work Schedule
                </Typography>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>Daily Hours:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {employee.dailyHours || 8} hours
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>Weekly Hours:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {(employee.dailyHours || 8) * 5} hours
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>Utilisation:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {((employee.utilisation || 0.85) * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: 2, backgroundColor: '#f8f9fa' }}>
                <Typography variant="h6" sx={{ mb: 2, color: '#2c3e50', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <StarIcon color="primary" />
                  Performance
                </Typography>
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>Skills Count:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {employee.skills ? Object.keys(employee.skills).length : 0}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>Experience Level:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {employee.experienceLevel || 'Not specified'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>Status:</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {employee.status || 'Active'}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Skills Breakdown */}
      {employee.skills && Object.keys(employee.skills).length > 0 && (
        <Card sx={{ mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, color: '#2c3e50', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <BuildIcon color="primary" />
              Skills & Proficiency
            </Typography>
            <Grid container spacing={2}>
              {Object.entries(employee.skills).map(([skill, level]) => (
                <Grid item xs={12} sm={6} md={4} key={skill}>
                  <Paper sx={{ 
                    p: 2.5, 
                    borderRadius: 2, 
                    textAlign: 'center',
                    backgroundColor: 'rgba(102, 126, 234, 0.08)',
                    border: '1px solid rgba(102, 126, 234, 0.2)'
                  }}>
                    <Typography variant="h4" sx={{ color: '#667eea', fontWeight: 700, mb: 1 }}>
                      {skill}
                    </Typography>
                    <Chip
                      label={getSkillLevel(skill)}
                      color={getSkillColor(skill)}
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                      {((level as number) * 100).toFixed(0)}% proficiency
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Leave Information */}
      {employee.leave && employee.leave.length > 0 && (
        <Card sx={{ mb: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, color: '#2c3e50', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <EventIcon color="primary" />
              Leave Schedule
            </Typography>
            <Grid container spacing={2}>
              {employee.leave.map((leaveItem: any, index: number) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Paper sx={{ 
                    p: 2, 
                    borderRadius: 2, 
                    backgroundColor: '#f8f9fa',
                    border: '1px solid rgba(0,0,0,0.1)'
                  }}>
                    <Typography variant="body2" sx={{ color: '#7f8c8d', mb: 1 }}>
                      {leaveItem.type || 'Leave'}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, mb: 0.5 }}>
                      {new Date(leaveItem.start).toLocaleDateString()} - {new Date(leaveItem.end).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                      {Math.ceil((new Date(leaveItem.end).getTime() - new Date(leaveItem.start).getTime()) / (1000 * 60 * 60 * 24))} days
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Future Sections Placeholder */}
      <Card sx={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderRadius: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#2c3e50', fontWeight: 600 }}>
            Future Data Sections
          </Typography>
          <Typography variant="body2" sx={{ color: '#7f8c8d', mb: 2 }}>
            This page is designed to accommodate additional employee data in the future, such as:
          </Typography>
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#7f8c8d' }}>• Performance reviews and ratings</Typography>
            <Typography variant="body2" sx={{ color: '#7f8c8d' }}>• Training and certification history</Typography>
            <Typography variant="body2" sx={{ color: '#7f8c8d' }}>• Project assignments and workload</Typography>
            <Typography variant="body2" sx={{ color: '#7f8c8d' }}>• Salary and benefits information</Typography>
            <Typography variant="body2" sx={{ color: '#7f8c8d' }}>• Attendance and time tracking</Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
