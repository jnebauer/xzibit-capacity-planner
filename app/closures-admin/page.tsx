'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';

// ─── Types ────────────────────────────────────────────────────────────────────

type ClosureType = 'Public Holiday' | 'Christmas Shutdown' | 'Workshop Maintenance' | 'Other';

interface CpClosure {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  closureType: ClosureType | string;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface SharedClosure {
  id: string;
  name: string;
  date: string;
  jurisdiction: string;
  closureType: string;
  active: boolean;
}

const CLOSURE_TYPES: ClosureType[] = [
  'Public Holiday',
  'Christmas Shutdown',
  'Workshop Maintenance',
  'Other',
];

const JURISDICTIONS = [
  { value: 'national', label: 'National (AU)' },
  { value: 'vic', label: 'Victoria' },
  { value: 'nsw', label: 'New South Wales' },
  { value: 'qld', label: 'Queensland' },
  { value: 'wa', label: 'Western Australia' },
  { value: 'sa', label: 'South Australia' },
  { value: 'tas', label: 'Tasmania' },
  { value: 'act', label: 'ACT' },
  { value: 'nt', label: 'Northern Territory' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function dateRange(start: string, end: string) {
  if (start === end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function typeColor(type: string): string {
  switch (type) {
    case 'Christmas Shutdown': return 'pill--coral';
    case 'Workshop Maintenance': return 'pill--amber';
    case 'Public Holiday': return 'pill--sky';
    default: return 'pill--lilac';
  }
}

// ─── Empty form state ─────────────────────────────────────────────────────────

interface ClosureForm {
  name: string;
  startDate: string;
  endDate: string;
  closureType: ClosureType;
  notes: string;
}

function emptyForm(): ClosureForm {
  return { name: '', startDate: '', endDate: '', closureType: 'Workshop Maintenance', notes: '' };
}

// ─── Add / Edit Dialog ────────────────────────────────────────────────────────

function ClosureDialog({
  open,
  initial,
  onClose,
  onSave,
  saving,
  error,
}: {
  open: boolean;
  initial: ClosureForm;
  onClose: () => void;
  onSave: (form: ClosureForm) => void;
  saving: boolean;
  error?: string | null;
}) {
  const [form, setForm] = useState<ClosureForm>(initial);

  // Sync when initial changes (for edit)
  // We reset on open via key prop in parent

  function field(k: keyof ClosureForm, label: string, type = 'text') {
    return (
      <TextField
        label={label}
        type={type}
        size="small"
        fullWidth
        value={form[k]}
        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
        InputLabelProps={type === 'date' ? { shrink: true } : undefined}
      />
    );
  }

  const canSave =
    form.name.trim() !== '' &&
    form.startDate !== '' &&
    form.endDate !== '' &&
    form.endDate >= form.startDate;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)', fontWeight: 600 }}>
        {initial.name ? 'Edit shutdown' : 'Add shutdown'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {field('name', 'Name')}
          {field('startDate', 'Start date', 'date')}
          {field('endDate', 'End date', 'date')}
          <Select
            size="small"
            value={form.closureType}
            onChange={(e) => setForm((f) => ({ ...f, closureType: e.target.value as ClosureType }))}
          >
            {CLOSURE_TYPES.map((t) => (
              <MenuItem key={t} value={t}>{t}</MenuItem>
            ))}
          </Select>
          <TextField
            label="Notes (optional)"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
          {form.endDate && form.startDate && form.endDate < form.startDate && (
            <Alert severity="warning">End date must be on or after start date.</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <button className="btn btn--ghost" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button
          className="btn btn--primary"
          onClick={() => onSave(form)}
          disabled={!canSave || saving}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Delete confirm dialog ────────────────────────────────────────────────────

function DeleteDialog({
  open,
  name,
  onClose,
  onConfirm,
  deleting,
}: {
  open: boolean;
  name: string;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle style={{ fontFamily: 'var(--font-inter, Inter, sans-serif)', fontWeight: 600 }}>
        Delete shutdown?
      </DialogTitle>
      <DialogContent>
        <p style={{ margin: 0 }}>
          <strong>{name}</strong> will be removed from the workshop schedule. This cannot be undone.
        </p>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <button className="btn btn--ghost" onClick={onClose} disabled={deleting}>
          Cancel
        </button>
        <button className="btn btn--primary" onClick={onConfirm} disabled={deleting}
          style={{ background: 'var(--xz-coral-500, #F87171)', boxShadow: 'none' }}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Section 1: Workshop shutdowns ───────────────────────────────────────────

function WorkshopShutdowns() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CpClosure | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CpClosure | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<{ closures: CpClosure[] }>({
    queryKey: ['cp-closures'],
    queryFn: () => fetch('/api/closures/cp').then((r) => r.json()),
  });

  const closures = data?.closures ?? [];

  const addMutation = useMutation({
    mutationFn: (form: ClosureForm) =>
      fetch('/api/closures/cp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          startDate: form.startDate,
          endDate: form.endDate,
          closureType: form.closureType,
          notes: form.notes.trim() || null,
        }),
      }).then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || 'Failed to create');
        return json;
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cp-closures'] });
      setAddOpen(false);
      setDialogError(null);
    },
    onError: (e: Error) => setDialogError(e.message),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, form }: { id: string; form: ClosureForm }) =>
      fetch(`/api/closures/cp/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          startDate: form.startDate,
          endDate: form.endDate,
          closureType: form.closureType,
          notes: form.notes.trim() || null,
        }),
      }).then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || 'Failed to update');
        return json;
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cp-closures'] });
      setEditTarget(null);
      setDialogError(null);
    },
    onError: (e: Error) => setDialogError(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/closures/cp/${id}`, { method: 'DELETE' }).then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || 'Failed to delete');
        return json;
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cp-closures'] });
      setDeleteTarget(null);
    },
  });

  // Group closures by year
  const byYear = useMemo(() => {
    const map = new Map<number, CpClosure[]>();
    for (const c of closures) {
      const year = c.startDate ? parseInt(c.startDate.slice(0, 4), 10) : 0;
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(c);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [closures]);

  const editForm: ClosureForm = editTarget
    ? {
        name: editTarget.name,
        startDate: editTarget.startDate,
        endDate: editTarget.endDate,
        closureType: (editTarget.closureType as ClosureType) || 'Other',
        notes: editTarget.notes ?? '',
      }
    : emptyForm();

  return (
    <div className="card" style={{ marginBottom: 'var(--xz-s-6, 32px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--xz-s-4, 16px)' }}>
        <div>
          <div className="h3">Workshop shutdowns</div>
          <p className="subtle" style={{ marginTop: 4 }}>
            Dates when the workshop is closed — excluded from capacity calculations.
          </p>
        </div>
        <button className="btn btn--primary" onClick={() => { setDialogError(null); setAddOpen(true); }}>
          + Add shutdown
        </button>
      </div>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} sx={{ color: 'var(--xz-teal, #19B1A1)' }} />
        </Box>
      )}

      {error && (
        <Alert severity="error">Failed to load shutdowns.</Alert>
      )}

      {!isLoading && !error && closures.length === 0 && (
        <p className="subtle" style={{ textAlign: 'center', padding: 'var(--xz-s-6, 32px)' }}>
          No shutdowns configured yet.
        </p>
      )}

      {!isLoading && byYear.map(([year, items]) => (
        <div key={year} className="group" style={{ marginBottom: 'var(--xz-s-3, 12px)' }}>
          <div className="group-head">
            <div className="title">
              <span className="title-text">{year}</span>
            </div>
            <span className="count">{items.length} {items.length === 1 ? 'closure' : 'closures'}</span>
          </div>

          {/* Header row */}
          <div className="row" style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
            gap: 'var(--xz-s-3, 12px)',
            padding: '8px 12px',
            borderBottom: '1px solid var(--xz-hairline, #E2E8F0)',
          }}>
            <span className="meta" style={{ fontWeight: 600 }}>Name</span>
            <span className="meta" style={{ fontWeight: 600 }}>Dates</span>
            <span className="meta" style={{ fontWeight: 600 }}>Type</span>
            <span className="meta" style={{ fontWeight: 600 }}>Notes</span>
            <span className="meta" style={{ fontWeight: 600, textAlign: 'right' }}>Actions</span>
          </div>

          {items.map((c) => (
            <div key={c.id} className="row" style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
              gap: 'var(--xz-s-3, 12px)',
              padding: '10px 12px',
              alignItems: 'center',
              borderBottom: '1px solid var(--xz-hairline, #E2E8F0)',
            }}>
              <span style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</span>
              <span className="subtle">{dateRange(c.startDate, c.endDate)}</span>
              <span>
                <span className={`pill ${typeColor(c.closureType)}`}>
                  {c.closureType}
                </span>
              </span>
              <span className="subtle">{c.notes ?? '—'}</span>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  className="btn btn--ghost"
                  style={{ padding: '4px 12px', fontSize: 13 }}
                  onClick={() => { setDialogError(null); setEditTarget(c); }}
                >
                  Edit
                </button>
                <button
                  className="btn btn--ghost"
                  style={{ padding: '4px 12px', fontSize: 13, color: 'var(--xz-coral-500, #F87171)' }}
                  onClick={() => setDeleteTarget(c)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Add dialog */}
      <ClosureDialog
        key={addOpen ? 'add-open' : 'add-closed'}
        open={addOpen}
        initial={emptyForm()}
        onClose={() => { setAddOpen(false); setDialogError(null); }}
        onSave={(form) => addMutation.mutate(form)}
        saving={addMutation.isPending}
        error={dialogError}
      />

      {/* Edit dialog */}
      <ClosureDialog
        key={editTarget ? `edit-${editTarget.id}` : 'edit-closed'}
        open={!!editTarget}
        initial={editForm}
        onClose={() => { setEditTarget(null); setDialogError(null); }}
        onSave={(form) => editTarget && editMutation.mutate({ id: editTarget.id, form })}
        saving={editMutation.isPending}
        error={dialogError}
      />

      {/* Delete confirm */}
      <DeleteDialog
        open={!!deleteTarget}
        name={deleteTarget?.name ?? ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        deleting={deleteMutation.isPending}
      />
    </div>
  );
}

// ─── Section 2: Shared public holidays (read-only) ────────────────────────────

function PublicHolidays() {
  const [jurisdiction, setJurisdiction] = useState('national');

  const { data, isLoading, error } = useQuery<{ closures: SharedClosure[] }>({
    queryKey: ['shared-closures', jurisdiction],
    queryFn: () => fetch(`/api/closures/shared?jurisdictions=${jurisdiction}`).then((r) => r.json()),
  });

  const closures = data?.closures ?? [];

  // Group by year
  const byYear = useMemo(() => {
    const map = new Map<number, SharedClosure[]>();
    for (const c of closures) {
      const year = c.date ? parseInt(c.date.slice(0, 4), 10) : 0;
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(c);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [closures]);

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--xz-s-4, 16px)', gap: 16 }}>
        <div>
          <div className="h3">Public holidays</div>
          <p className="subtle" style={{ marginTop: 4 }}>
            Read-only. Managed in the{' '}
            <a
              href="https://xzibit-milestone-calculator.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--xz-teal, #19B1A1)' }}
            >
              Milestone Calculator
            </a>
            .
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="meta">Jurisdiction:</span>
          <Select
            size="small"
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value as string)}
            sx={{ minWidth: 180 }}
          >
            {JURISDICTIONS.map((j) => (
              <MenuItem key={j.value} value={j.value}>{j.label}</MenuItem>
            ))}
          </Select>
        </div>
      </div>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} sx={{ color: 'var(--xz-teal, #19B1A1)' }} />
        </Box>
      )}

      {error && <Alert severity="error">Failed to load public holidays.</Alert>}

      {!isLoading && !error && closures.length === 0 && (
        <p className="subtle" style={{ textAlign: 'center', padding: 'var(--xz-s-6, 32px)' }}>
          No public holidays found for this jurisdiction.
        </p>
      )}

      {!isLoading && byYear.map(([year, items]) => (
        <div key={year} className="group" style={{ marginBottom: 'var(--xz-s-3, 12px)' }}>
          <div className="group-head">
            <div className="title">
              <span className="title-text">{year}</span>
            </div>
            <span className="count">{items.length}</span>
          </div>

          {/* Header row */}
          <div className="row" style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: 'var(--xz-s-3, 12px)',
            padding: '8px 12px',
            borderBottom: '1px solid var(--xz-hairline, #E2E8F0)',
          }}>
            <span className="meta" style={{ fontWeight: 600 }}>Name</span>
            <span className="meta" style={{ fontWeight: 600 }}>Date</span>
            <span className="meta" style={{ fontWeight: 600 }}>Type</span>
            <span className="meta" style={{ fontWeight: 600 }}>Jurisdiction</span>
          </div>

          {items.map((c) => (
            <div key={c.id} className="row" style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr',
              gap: 'var(--xz-s-3, 12px)',
              padding: '10px 12px',
              alignItems: 'center',
              borderBottom: '1px solid var(--xz-hairline, #E2E8F0)',
            }}>
              <span style={{ fontWeight: 500, fontSize: 14 }}>{c.name}</span>
              <span className="subtle">{formatDate(c.date)}</span>
              <span>
                <span className={`pill ${typeColor(c.closureType)}`}>
                  {c.closureType}
                </span>
              </span>
              <span className="meta">{c.jurisdiction}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClosuresAdminPage() {
  return (
    <div style={{ maxWidth: 'var(--xz-content-max, 1320px)', margin: '0 auto' }}>
      <div className="topbar">
        <div className="topbar-title">
          <div className="h3">Closures admin</div>
          <span className="pill pill--sky">Admin</span>
        </div>
      </div>

      <div className="page" style={{ padding: 'var(--xz-s-6, 32px) var(--xz-s-7, 40px)' }}>
        <div style={{ marginBottom: 'var(--xz-s-5, 24px)' }}>
          <h1 className="h1">Closures admin</h1>
          <p className="subtle">
            Manage workshop shutdowns and view public holidays. Both sets of dates are used by the
            capacity engine when calculating available production weeks.
          </p>
        </div>

        <WorkshopShutdowns />
        <PublicHolidays />
      </div>
    </div>
  );
}
