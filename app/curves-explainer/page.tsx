'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Box, Card, CardContent, Typography, TextField, Select, MenuItem, FormControl, InputLabel, CircularProgress, Alert } from '@mui/material';
import {
  CHART_GRID,
  CHART_AXIS_TEXT,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_LEGEND_STYLE,
  CHART_PALETTE,
  CHART_ALGO_PALETTE,
} from '@/lib/chartTokens';

const SKILL_STROKE: Record<string, string> = {
  CNC: CHART_PALETTE.cnc,
  Build: CHART_PALETTE.build,
  Paint: CHART_PALETTE.paint,
  AV: CHART_PALETTE.av,
  'Pack & Load': CHART_PALETTE.packLoad,
};

// Utility functions for curve calculations
function rampUpWeights(N: number): number[] { 
  const denom = (N * (N + 1)) / 2; 
  if (!denom) return []; 
  return Array.from({ length: N }, (_, i) => (i + 1) / denom); 
}

function triangularWeights(N: number): number[] { 
  return rampUpWeights(N); 
}

function bellCurveWeights(N: number): number[] {
  if (N <= 1) return [1];
  
  const weights = [];
  for (let i = 0; i < N; i++) {
    const progress = i / (N - 1);
    const bell = Math.exp(-Math.pow((progress - 0.5) / 0.2, 2));
    weights.push(bell);
  }
  
  // Normalize to sum to 1
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w / sum);
}

function interp1(x: number[], y: number[], xq: number) { 
  if (xq <= x[0]) return y[0]; 
  if (xq >= x[x.length - 1]) return y[y.length - 1]; 
  let i = 1; 
  while (i < x.length && xq > x[i]) i++; 
  const x0 = x[i - 1], x1 = x[i]; 
  const y0 = y[i - 1], y1 = y[i]; 
  const t = (xq - x0) / (x1 - x0); 
  return y0 + (y1 - y0) * t; 
}

function libraryWeights(projectType: string | undefined | null, skill: string, N: number, curveLibrary: any): number[] { 
  const entry = projectType ? curveLibrary?.find((c: any) => c.name === projectType) : undefined; 
  const curve = entry?.curves?.[skill]; 
  if (!curve || !curve.breaks?.length) return bellCurveWeights(N); 
  const xs = curve.breaks.map(Number); 
  const ys = curve.weights.map(Number); 
  const w = Array.from({ length: N }, (_, k) => interp1(xs, ys, (k + 0.5) / N)); 
  const s = w.reduce((a, b) => a + b, 0); 
  return s > 0 ? w.map(v => v / s) : bellCurveWeights(N); 
}

export default function CurvesExplainer() {
  const [selectedJobType, setSelectedJobType] = useState<string>('');
  const [weeks, setWeeks] = useState<number>(8);

  // Fetch real data from projects, job types, and curve library
  const { data: projectsData, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      if (!response.ok) throw new Error('Failed to fetch projects');
      return response.json();
    }
  });

  const { data: jobTypesData, isLoading: jobTypesLoading, error: jobTypesError } = useQuery({
    queryKey: ['job-types'],
    queryFn: async () => {
      const response = await fetch('/api/job-types');
      if (!response.ok) throw new Error('Failed to fetch job types');
      return response.json();
    }
  });

  const { data: curveLibraryData, isLoading: curveLibraryLoading, error: curveLibraryError } = useQuery({
    queryKey: ['curve-library'],
    queryFn: async () => {
      const response = await fetch('/api/curve-library/import');
      if (!response.ok) throw new Error('Failed to fetch curve library');
      return response.json();
    }
  });

  // Get unique job types from the JobTypes collection
  const jobTypes = useMemo(() => {
    if (!jobTypesData) return [];
    return jobTypesData.filter((jt: any) => jt.isActive).map((jt: any) => jt.name);
  }, [jobTypesData]);

  // Define skills for the curves (matching new project model)
  const skills = ["CNC", "Build", "Paint", "AV", "Pack & Load"];

  // Set initial job type when data loads
  useMemo(() => {
    if (jobTypes.length > 0 && !selectedJobType) {
      setSelectedJobType(jobTypes[0]);
    }
  }, [jobTypes, selectedJobType]);

  // Get projects of selected job type with matching build weeks
  const matchingProjects = useMemo(() => {
    if (!projectsData || !selectedJobType) return [];
    
    return projectsData.filter((p: any) => {
      // Check if project has the selected job type
      const hasJobType = p.jobType && typeof p.jobType === 'object' && p.jobType.name === selectedJobType;
      const hasWeeks = p.weeksToBuild === weeks;
      
      return hasJobType && hasWeeks;
    });
  }, [projectsData, selectedJobType, weeks]);

  // Calculate aggregated job type statistics
  const jobTypeStats = useMemo(() => {
    if (!matchingProjects.length) return null;

    // Aggregate data across all matching projects using new model structure
    const totalHours = matchingProjects.reduce((sum: number, project: any) => {
      return sum + (project.cnc || 0) + (project.build || 0) + (project.paint || 0) + 
                    (project.av || 0) + (project.packAndLoad || 0);
    }, 0);

    const avgWeeksToBuild = weeks;
    const avgOnsiteWeeks = matchingProjects.reduce((sum: number, project: any) => 
      sum + (project.onsiteWeeks || 0), 0) / matchingProjects.length;
    const totalWeeks = avgWeeksToBuild + avgOnsiteWeeks;

    // Get most common curve mode
    const curveModes = matchingProjects.map((p: any) => p.curveMode || 'Mathematician');
    const mostCommonCurveMode = curveModes.sort((a: string, b: string) => 
      curveModes.filter((v: string) => v === a).length - curveModes.filter((v: string) => v === b).length
    ).pop() || 'Mathematician';

    // Calculate skill-specific totals
    const skillTotals = {
      cnc: matchingProjects.reduce((sum: number, p: any) => sum + (p.cnc || 0), 0),
      build: matchingProjects.reduce((sum: number, p: any) => sum + (p.build || 0), 0),
      paint: matchingProjects.reduce((sum: number, p: any) => sum + (p.paint || 0), 0),
      av: matchingProjects.reduce((sum: number, p: any) => sum + (p.av || 0), 0),
      packAndLoad: matchingProjects.reduce((sum: number, p: any) => sum + (p.packAndLoad || 0), 0)
    };

    return {
      totalHours,
      weeksToBuild: avgWeeksToBuild,
      onsiteWeeks: avgOnsiteWeeks,
      totalWeeks,
      curveMode: mostCommonCurveMode,
      projectCount: matchingProjects.length,
      skillTotals
    };
  }, [matchingProjects, weeks]);

  // Generate chart datasets with skill-specific curves
  const datasets = useMemo(() => {
    const ws = Array.from({ length: weeks }, (_, i) => i + 1);
    
    // Generate chart data
    return ws.map((weekNum, index) => {
      const weekData: any = { 
        label: `W${weekNum}`,
        week: weekNum
      };
      
      // Add skill-specific curves from curve library or default to bell curve
      skills.forEach(skill => {
        if (curveLibraryData?.curves) {
          const skillCurve = libraryWeights(selectedJobType, skill, weeks, curveLibraryData.curves);
          weekData[skill] = Number((skillCurve[index] || 0).toFixed(4));
        } else {
          // Default to bell curve if no library data
          const bellCurve = bellCurveWeights(weeks);
          weekData[skill] = Number((bellCurve[index] || 0).toFixed(4));
        }
      });
      
      // Add theoretical curves for comparison
      const lin = rampUpWeights(weeks);
      const tri = triangularWeights(weeks);
      const bell = bellCurveWeights(weeks);
      
      weekData["Linear"] = Number((lin[index] || 0).toFixed(4));
      weekData["Triangular"] = Number((tri[index] || 0).toFixed(4));
      weekData["Bell Curve"] = Number((bell[index] || 0).toFixed(4));
      
      return weekData;
    });
  }, [weeks, curveLibraryData, selectedJobType]);

  const isLoading = projectsLoading || jobTypesLoading || curveLibraryLoading;
  const hasError = projectsError || jobTypesError || curveLibraryError;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (hasError) {
    return (
      <Alert severity="error">
        Failed to load data. Please try refreshing the page.
      </Alert>
    );
  }

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
            Workload distribution curves by job type
          </Typography>

          <Box sx={{ display: 'grid', gap: 3 }}>
            {/* Job Type Selection Controls */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'end' }}>
              <FormControl sx={{ minWidth: 250 }}>
                <InputLabel>Job type</InputLabel>
                <Select
                  value={selectedJobType}
                  onChange={(e) => setSelectedJobType(e.target.value)}
                  label="Job type"
                >
                  {jobTypes.map((type: string) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Build weeks"
                type="number"
                value={weeks}
                inputProps={{ min: 1, max: 52 }}
                onChange={(e) => setWeeks(Math.max(1, Math.min(52, Math.floor(Number(e.target.value) || 1))))}
                sx={{ width: 150 }}
              />
            </Box>

            {/* Job Type Statistics */}
            {jobTypeStats && (
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">Total hours</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--xz-teal)' }}>
                    {jobTypeStats.totalHours.toFixed(1)}h
                  </Typography>
                </Card>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">Build weeks</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--xz-teal)' }}>
                    {jobTypeStats.weeksToBuild} weeks
                  </Typography>
                </Card>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">Onsite weeks</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--xz-teal)' }}>
                    {jobTypeStats.onsiteWeeks.toFixed(1)} weeks
                  </Typography>
                </Card>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">Curve mode</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--xz-teal)' }}>
                    {jobTypeStats.curveMode}
                  </Typography>
                </Card>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">Projects</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: 'var(--xz-teal)' }}>
                    {jobTypeStats.projectCount}
                  </Typography>
                </Card>
              </Box>
            )}

            {/* Skill Breakdown */}
            {jobTypeStats && (
              <Card variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Skill breakdown for {selectedJobType}
                </Typography>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">CNC</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: CHART_PALETTE.cnc }}>
                      {jobTypeStats.skillTotals.cnc.toFixed(1)}h
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Build</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: CHART_PALETTE.build }}>
                      {jobTypeStats.skillTotals.build.toFixed(1)}h
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Paint</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: CHART_PALETTE.paint }}>
                      {jobTypeStats.skillTotals.paint.toFixed(1)}h
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">AV</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: CHART_PALETTE.av }}>
                      {jobTypeStats.skillTotals.av.toFixed(1)}h
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">Pack & Load</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: CHART_PALETTE.packLoad }}>
                      {jobTypeStats.skillTotals.packAndLoad.toFixed(1)}h
                    </Typography>
                  </Box>
                </Box>
              </Card>
            )}

            {/* Chart */}
            <Box sx={{ height: 500, width: '100%' }}>
              <ResponsiveContainer>
                <LineChart data={datasets}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                  <XAxis
                    dataKey="label"
                    stroke={CHART_AXIS_TEXT}
                    tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }}
                  />
                  <YAxis
                    stroke={CHART_AXIS_TEXT}
                    tick={{ fontSize: 12, fill: CHART_AXIS_TEXT }}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                    cursor={{ stroke: CHART_GRID }}
                  />
                  <Legend wrapperStyle={{ ...CHART_LEGEND_STYLE, paddingTop: '20px' }} />

                  {/* Skill-specific curves */}
                  {skills.map((skill) => (
                    <Line
                      key={skill}
                      type="monotone"
                      dataKey={skill}
                      name={`${skill} (${curveLibraryData?.curves ? 'Library' : 'Bell Curve'})`}
                      dot={false}
                      strokeWidth={3}
                      stroke={SKILL_STROKE[skill]}
                      activeDot={{ r: 6, stroke: SKILL_STROKE[skill], strokeWidth: 2 }}
                    />
                  ))}

                  {/* Theoretical curves */}
                  <Line
                    type="monotone"
                    dataKey="Linear"
                    name="Linear (uniform)"
                    dot={false}
                    strokeWidth={2}
                    stroke={CHART_ALGO_PALETTE.linear}
                    strokeDasharray="5 5"
                    activeDot={{ r: 6, stroke: CHART_ALGO_PALETTE.linear, strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Triangular"
                    name="Triangular (peak at end)"
                    dot={false}
                    strokeWidth={2}
                    stroke={CHART_ALGO_PALETTE.triangular}
                    strokeDasharray="10 5"
                    activeDot={{ r: 6, stroke: CHART_ALGO_PALETTE.triangular, strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Bell Curve"
                    name="Bell curve (peak in middle)"
                    dot={false}
                    strokeWidth={2}
                    stroke={CHART_ALGO_PALETTE.bell}
                    strokeDasharray="15 5"
                    activeDot={{ r: 6, stroke: CHART_ALGO_PALETTE.bell, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>

            {/* Information Card */}
            <Card variant="outlined">
              <CardContent sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13, lineHeight: 1.5 }}>
                  <strong>Workload distribution curves</strong> show how project hours are distributed across the build timeline for different job types and skills.
                  <strong> Library curves</strong> are pulled from your curve library data when available.
                  <strong> Bell curve</strong> represents a normal distribution with peak workload in the middle.
                  <strong> Triangular</strong> shows increasing workload towards the end (truck date).
                  <strong> Linear</strong> represents uniform distribution across all weeks.
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
