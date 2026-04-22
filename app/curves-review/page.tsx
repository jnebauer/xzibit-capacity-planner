'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CHART_GRID,
  CHART_AXIS_TEXT,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_BRAND_STROKE,
} from '@/lib/chartTokens';

// ─── Types ────────────────────────────────────────────────────────────────────

type CurveStatus = 'Draft' | 'Active' | 'Archived';
type StatusFilter = 'All' | CurveStatus;
type PageTab = 'registry' | 'allCurves';

interface CurveShape {
  progressValues: number[];
  curveValues: number[];
  normalizationValue: number;
}

interface Curve {
  curveId: string;
  version: string;
  jobType: string;
  taskType: string;
  curveStatus: CurveStatus | string;
  weeklyPercentages: CurveShape | string;
  description?: string | null;
  derivedFrom?: string | null;
  curveFamily?: string | null;
  specSource?: string | null;
  fitQuality?: number | null;
  specValidated?: boolean;
  isRegistryDefault: boolean;
  updatedAt?: string | null;
}

interface CurvesResponse {
  curves: Curve[];
  counts: Record<string, number>;
  total: number;
}

interface RegistryEntry {
  id: number | null;
  jobType: string;
  taskType: string;
  defaultCurveId: string;
  reason: string | null;
}

interface RegistryResponse {
  registry: RegistryEntry[];
  total: number;
}

interface ListCurve {
  id: number;
  curveId: string;
  version: string;
  jobType: string;
  taskType: string;
  curveStatus: string;
  description: string | null;
  weeklyPercentages: CurveShape | null;
}

interface ListCurvesResponse {
  curves: ListCurve[];
  total: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TASK_TYPES = ['CNC', 'Build', 'Paint', 'AV', 'Pack & Load'] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusPillClass(status: string): string {
  switch (status) {
    case 'Active': return 'pill pill--mint';
    case 'Draft': return 'pill pill--sky';
    case 'Archived': return 'pill pill--muted';
    default: return 'pill pill--muted';
  }
}

function parseShape(weeklyPercentages: CurveShape | string | null | undefined): CurveShape {
  if (!weeklyPercentages) return { progressValues: [], curveValues: [], normalizationValue: 1 };
  if (typeof weeklyPercentages === 'string') {
    try { return JSON.parse(weeklyPercentages); } catch { return { progressValues: [], curveValues: [], normalizationValue: 1 }; }
  }
  return weeklyPercentages;
}

/** Resample curveValues to n evenly-spaced points for the sparkline */
function resampleCurveValues(values: number[], n: number): number[] {
  if (!values || values.length === 0) return Array(n).fill(0);
  if (values.length <= n) return values;
  return Array.from({ length: n }, (_, i) => {
    const idx = Math.floor((i / (n - 1)) * (values.length - 1));
    return values[idx];
  });
}

// ─── Inline SVG sparkline ─────────────────────────────────────────────────────

function Sparkline({ weeklyPercentages }: { weeklyPercentages: CurveShape | string | null | undefined }) {
  const W = 120, H = 40, PADDING = 2;
  const shape = parseShape(weeklyPercentages);
  const pts = resampleCurveValues(shape.curveValues || [], 30);
  const max = Math.max(...pts, 0.001);
  const coords = pts.map((v, i) => {
    const x = PADDING + ((i / (pts.length - 1)) * (W - PADDING * 2));
    const y = H - PADDING - ((v / max) * (H - PADDING * 2));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const d = pts.length > 1 ? `M ${coords.join(' L ')}` : '';
  return (
    <svg width={W} height={H} style={{ display: 'block', flexShrink: 0 }}>
      <path d={d} fill="none" stroke="var(--xz-teal)" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

// ─── API fetchers / mutators ──────────────────────────────────────────────────

async function fetchAllCurves(): Promise<CurvesResponse> {
  const res = await fetch('/api/curves', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load curves');
  return res.json();
}

async function fetchCurveList(): Promise<ListCurvesResponse> {
  const res = await fetch('/api/curves/list', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load curve list');
  return res.json();
}

async function fetchRegistry(): Promise<RegistryResponse> {
  const res = await fetch('/api/curves/registry', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load registry');
  return res.json();
}

async function fetchJobTypes(): Promise<{ id: string; name: string }[]> {
  const res = await fetch('/api/job-types', { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  // The job-types API returns an array or { jobTypes: [...] }
  return Array.isArray(data) ? data : (data.jobTypes ?? []);
}

async function updateCurveStatus(curveId: string, status: CurveStatus) {
  const res = await fetch(`/api/curves/${encodeURIComponent(curveId)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Update failed');
  }
  return res.json();
}

async function updateRegistry(payload: { jobType: string; taskType: string; defaultCurveId: string; reason: string }) {
  const res = await fetch('/api/curves/registry', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Save failed');
  }
  return res.json();
}

// ─── Registry grid cell ───────────────────────────────────────────────────────

function RegistryCell({
  jobType,
  taskType,
  entry,
  curvesForSlot,
  onSaved,
}: {
  jobType: string;
  taskType: string;
  entry: RegistryEntry | undefined;
  curvesForSlot: ListCurve[];
  onSaved: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedCurveId, setSelectedCurveId] = useState(entry?.defaultCurveId ?? '');
  const [reason, setReason] = useState(entry?.reason ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const activeCurves = curvesForSlot.filter((c) => c.curveStatus === 'Active');

  const currentCurve = curvesForSlot.find((c) => c.curveId === entry?.defaultCurveId);

  async function handleSave() {
    if (!selectedCurveId) return;
    if (!reason.trim()) { setSaveError('Reason is required'); return; }
    setSaving(true);
    setSaveError(null);
    try {
      await updateRegistry({ jobType, taskType, defaultCurveId: selectedCurveId, reason: reason.trim() });
      setExpanded(false);
      onSaved();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minWidth: 148 }}>
      {entry ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="pill pill--mint" style={{ fontSize: 11, alignSelf: 'flex-start' }}>
            Set
          </span>
          <Sparkline weeklyPercentages={currentCurve?.weeklyPercentages} />
          <div className="meta" style={{ fontSize: 11, wordBreak: 'break-all' }}>
            {entry.defaultCurveId}
          </div>
          {entry.reason && (
            <div className="meta" style={{ fontSize: 10, color: 'var(--xz-ink-400)', fontStyle: 'italic' }}>
              {entry.reason}
            </div>
          )}
        </div>
      ) : (
        <span className="pill pill--amber" style={{ fontSize: 11 }}>
          Unset — flat fallback
        </span>
      )}

      <button
        className="btn btn--ghost"
        style={{ marginTop: 6, fontSize: 11, padding: '2px 8px' }}
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? '▲ Close' : entry ? '✎ Change' : '+ Pick curve'}
      </button>

      {expanded && (
        <div style={{
          marginTop: 8,
          padding: 'var(--xz-s-3)',
          background: 'var(--xz-surface-soft)',
          borderRadius: 'var(--xz-r-sm)',
          border: '1px solid var(--xz-hairline)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          {activeCurves.length === 0 ? (
            <div className="meta">No active curves for this slot.</div>
          ) : (
            activeCurves.map((c) => (
              <label key={c.curveId} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name={`${jobType}|${taskType}`}
                  value={c.curveId}
                  checked={selectedCurveId === c.curveId}
                  onChange={() => setSelectedCurveId(c.curveId)}
                  style={{ marginTop: 2 }}
                />
                <div>
                  <div style={{ fontSize: 11, fontFamily: 'monospace' }}>{c.curveId}</div>
                  {c.description && <div className="meta" style={{ fontSize: 10 }}>{c.description}</div>}
                  <Sparkline weeklyPercentages={c.weeklyPercentages} />
                </div>
              </label>
            ))
          )}

          <TextField
            size="small"
            label="Reason (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            multiline
            minRows={2}
            placeholder="e.g. Adrian Whiplash baseline v1.0"
            error={!!saveError}
            helperText={saveError ?? undefined}
            fullWidth
          />
          <button
            className="btn btn--primary"
            onClick={handleSave}
            disabled={saving || !selectedCurveId || !reason.trim()}
            style={{ alignSelf: 'flex-end' }}
          >
            {saving ? 'Saving…' : 'Set as default'}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Registry tab ─────────────────────────────────────────────────────────────

function RegistryTab() {
  const queryClient = useQueryClient();

  const { data: listData, isLoading: listLoading } = useQuery<ListCurvesResponse>({
    queryKey: ['curves-list'],
    queryFn: fetchCurveList,
  });

  const { data: regData, isLoading: regLoading } = useQuery<RegistryResponse>({
    queryKey: ['curves-registry'],
    queryFn: fetchRegistry,
  });

  const { data: jobTypesRaw = [], isLoading: jtLoading } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['job-types'],
    queryFn: fetchJobTypes,
  });

  const loading = listLoading || regLoading || jtLoading;

  // Build registry lookup: slotKey → entry
  const registryBySlot = useMemo(() => {
    const map = new Map<string, RegistryEntry>();
    (regData?.registry ?? []).forEach((entry) => {
      map.set(`${entry.jobType}|${entry.taskType}`, entry);
    });
    return map;
  }, [regData]);

  // Build curves lookup: slotKey → curves[]
  const curvesBySlot = useMemo(() => {
    const map = new Map<string, ListCurve[]>();
    (listData?.curves ?? []).forEach((c) => {
      const key = `${c.jobType}|${c.taskType}`;
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    });
    return map;
  }, [listData]);

  // Derive job type names: registry + job-types table (covers gaps like Other/Product/Re-install)
  const jobTypes = useMemo(() => {
    const fromRegistry = new Set<string>();
    (regData?.registry ?? []).forEach((e) => fromRegistry.add(e.jobType));
    (listData?.curves ?? []).forEach((c) => fromRegistry.add(c.jobType));
    const fromDb = jobTypesRaw.map((jt) => jt.name).filter(Boolean);
    const merged = Array.from(new Set([...fromDb, ...Array.from(fromRegistry)])).filter(Boolean);
    return merged.sort();
  }, [regData, listData, jobTypesRaw]);

  if (loading) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const unsetCount = jobTypes.reduce((n, jt) =>
    n + TASK_TYPES.filter((tt) => !registryBySlot.has(`${jt}|${tt}`)).length, 0);

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--xz-s-3)', marginBottom: 'var(--xz-s-4)', flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="pill pill--mint">
          {registryBySlot.size} slots set
        </span>
        {unsetCount > 0 && (
          <span className="pill pill--amber">
            {unsetCount} unset — flat fallback
          </span>
        )}
        <span className="subtle">
          Click ✎ Change or + Pick curve to assign a default. Reason is required on every save.
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          borderCollapse: 'collapse',
          fontSize: 13,
          width: '100%',
        }}>
          <thead>
            <tr style={{ background: 'var(--xz-surface-soft)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--xz-hairline)', fontWeight: 600, color: 'var(--xz-ink-500)', fontSize: 12, whiteSpace: 'nowrap' }}>
                Job type
              </th>
              {TASK_TYPES.map((tt) => (
                <th key={tt} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid var(--xz-hairline)', fontWeight: 600, color: 'var(--xz-ink-500)', fontSize: 12, whiteSpace: 'nowrap' }}>
                  {tt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobTypes.map((jt) => (
              <tr key={jt} style={{ borderBottom: '1px solid var(--xz-hairline)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 500, verticalAlign: 'top', whiteSpace: 'nowrap', color: 'var(--xz-ink)' }}>
                  {jt}
                </td>
                {TASK_TYPES.map((tt) => {
                  const key = `${jt}|${tt}`;
                  return (
                    <td key={tt} style={{ padding: '10px 12px', verticalAlign: 'top', background: registryBySlot.has(key) ? 'transparent' : 'var(--xz-amber-50, #FFFBEB)' }}>
                      <RegistryCell
                        jobType={jt}
                        taskType={tt}
                        entry={registryBySlot.get(key)}
                        curvesForSlot={curvesBySlot.get(key) ?? []}
                        onSaved={() => {
                          queryClient.invalidateQueries({ queryKey: ['curves-registry'] });
                          queryClient.invalidateQueries({ queryKey: ['curves-list'] });
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
            {jobTypes.length === 0 && (
              <tr>
                <td colSpan={TASK_TYPES.length + 1} style={{ padding: 24, textAlign: 'center', color: 'var(--xz-ink-400)' }}>
                  No job types found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── All-curves table (preserved from original scaffold) ──────────────────────

function AllCurvesTab() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery<CurvesResponse>({
    queryKey: ['curves'],
    queryFn: fetchAllCurves,
  });

  const [filter, setFilter] = useState<StatusFilter>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: ({ curveId, status }: { curveId: string; status: CurveStatus }) =>
      updateCurveStatus(curveId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['curves'] }),
  });

  const curves = data?.curves ?? [];
  const counts = data?.counts ?? {};
  const filtered = useMemo(() => filter === 'All' ? curves : curves.filter((c) => c.curveStatus === filter), [curves, filter]);
  const selected = useMemo(() => curves.find((c) => c.curveId === selectedId) ?? null, [curves, selectedId]);

  if (isLoading) return <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{(error as Error).message}</Alert>;

  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="body2" color="text.secondary">
          {data?.total ?? 0} total · {counts.Draft ?? 0} Draft · {counts.Active ?? 0} Active · {counts.Archived ?? 0} Archived
        </Typography>
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        Draft curves are invisible to the planning engine (it falls back to a flat distribution).
        Activate a curve to make it live; archive to retire it.
      </Alert>

      <ToggleButtonGroup
        exclusive size="small" value={filter}
        onChange={(_, v: StatusFilter | null) => { if (v) setFilter(v); }}
        sx={{ mb: 2 }}
      >
        {(['All', 'Draft', 'Active', 'Archived'] as const).map((v) => (
          <ToggleButton key={v} value={v}>{v}</ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Paper variant="outlined" sx={{
        overflow: 'hidden',
        '& .MuiTableHead-root .MuiTableCell-root': { backgroundColor: 'var(--xz-surface-soft)', color: 'var(--xz-ink-500)', fontWeight: 600, fontSize: 12, borderBottom: '1px solid var(--xz-hairline)' },
        '& .MuiTableCell-root': { borderBottomColor: 'var(--xz-hairline-soft)' },
        '& .MuiTableBody-root .MuiTableRow-root:hover': { backgroundColor: 'var(--xz-surface-soft)' },
      }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Job type</TableCell>
              <TableCell>Task</TableCell>
              <TableCell>Curve ID</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Registry default</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((curve) => (
              <TableRow hover key={curve.curveId}>
                <TableCell>{curve.jobType}</TableCell>
                <TableCell>{curve.taskType}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{curve.curveId}</TableCell>
                <TableCell>{curve.version}</TableCell>
                <TableCell><span className={statusPillClass(curve.curveStatus)}>{curve.curveStatus}</span></TableCell>
                <TableCell>{curve.isRegistryDefault ? 'Yes' : '—'}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => setSelectedId(curve.curveId)}>View</Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No curves match the current filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <CurveDetailDialog
        curve={selected}
        onClose={() => setSelectedId(null)}
        onStatusChange={(status) => { if (selected) mutation.mutate({ curveId: selected.curveId, status }); }}
        busy={mutation.isPending}
        errorMessage={mutation.error ? (mutation.error as Error).message : null}
      />
    </>
  );
}

// ─── Curve detail dialog (unchanged from original) ────────────────────────────

function CurveDetailDialog({
  curve, onClose, onStatusChange, busy, errorMessage,
}: {
  curve: Curve | null;
  onClose: () => void;
  onStatusChange: (status: CurveStatus) => void;
  busy: boolean;
  errorMessage: string | null;
}) {
  const chartData = useMemo(() => {
    if (!curve) return [];
    const shape = parseShape(curve.weeklyPercentages);
    return (shape.progressValues || []).map((p, i) => ({
      progress: Math.round(p * 100),
      intensity: Number(shape.curveValues?.[i] ?? 0),
    }));
  }, [curve]);

  if (!curve) return null;

  return (
    <Dialog open={!!curve} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" component="span">{curve.jobType} · {curve.taskType}</Typography>
          <span className={statusPillClass(curve.curveStatus)}>{curve.curveStatus}</span>
        </Stack>
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
          {curve.curveId} · {curve.version}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ height: 280, mt: 1, mb: 2 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="progress" stroke={CHART_AXIS_TEXT} tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }}
                label={{ value: 'Project progress %', position: 'insideBottom', offset: -8, fill: CHART_AXIS_TEXT, fontSize: 12 }} />
              <YAxis stroke={CHART_AXIS_TEXT} tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }}
                label={{ value: 'Intensity', angle: -90, position: 'insideLeft', fill: CHART_AXIS_TEXT, fontSize: 12 }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={CHART_TOOLTIP_LABEL_STYLE} cursor={{ stroke: CHART_GRID }} />
              <Line type="monotone" dataKey="intensity" stroke={CHART_BRAND_STROKE} strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
        <Stack spacing={0.5}>
          <Typography variant="body2"><strong>Spec source:</strong> {curve.specSource || '—'}</Typography>
          <Typography variant="body2"><strong>Curve family:</strong> {curve.curveFamily || '—'}</Typography>
          <Typography variant="body2"><strong>Fit quality:</strong> {curve.fitQuality ?? '—'}</Typography>
          <Typography variant="body2"><strong>Registry default:</strong> {curve.isRegistryDefault ? 'Yes' : 'No'}</Typography>
          {curve.description && <Typography variant="body2" color="text.secondary">{curve.description}</Typography>}
        </Stack>
        {errorMessage && <Alert severity="error" sx={{ mt: 2 }}>{errorMessage}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {curve.curveStatus !== 'Archived' && (
          <Button onClick={() => onStatusChange('Archived')} disabled={busy} variant="outlined">Archive</Button>
        )}
        {curve.curveStatus !== 'Draft' && (
          <Button onClick={() => onStatusChange('Draft')} disabled={busy} variant="outlined">Mark draft</Button>
        )}
        {curve.curveStatus !== 'Active' && (
          <Button onClick={() => onStatusChange('Active')} disabled={busy} variant="contained" color="primary">Activate</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─── Page root ────────────────────────────────────────────────────────────────

export default function CurveReviewPage() {
  const [tab, setTab] = useState<PageTab>('registry');

  return (
    <>
      <div className="topbar" style={{ marginBottom: 'var(--xz-s-4)' }}>
        <div className="topbar-title">
          <div className="h3">Curve review</div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 'var(--xz-s-4)' }}>
        <button
          className={tab === 'registry' ? 'tab is-active' : 'tab'}
          onClick={() => setTab('registry')}
        >
          Registry defaults
        </button>
        <button
          className={tab === 'allCurves' ? 'tab is-active' : 'tab'}
          onClick={() => setTab('allCurves')}
        >
          All curves
        </button>
      </div>

      {tab === 'registry' ? <RegistryTab /> : <AllCurvesTab />}
    </>
  );
}
