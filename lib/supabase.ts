import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL) throw new Error('SUPABASE_URL is missing');
if (!SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing');

// Server-side client with service role key (bypasses RLS)
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

// Helper to convert Supabase row to API-compatible format
// Maps Supabase snake_case fields to camelCase for backward compatibility
export function toProject(row: any) {
  if (!row) return null;
  return {
    _id: row.mongo_id || row.id,
    id: row.mongo_id || row.id,
    jobNumber: row.job_number,
    jobName: row.job_name,
    jobType: row.job_type_mongo_id,
    truckLoadDate: row.truck_load_date,
    weeksToBuild: row.weeks_to_build,
    status: row.status,
    probability: row.probability,
    cnc: row.cnc,
    build: row.build,
    paint: row.paint,
    av: row.av,
    packAndLoad: row.pack_and_load,
    tradeOnsite: row.trade_onsite,
    onsiteWeeks: row.onsite_weeks,
    installDeadline: row.install_deadline,
    hrsEstOnly: row.hrs_est_only,
    pm: row.pm,
    notes: row.notes,
    curveMode: row.curve_mode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function fromProject(body: any) {
  const mapped: any = {};
  if (body.jobNumber !== undefined) mapped.job_number = body.jobNumber;
  if (body.jobName !== undefined) mapped.job_name = body.jobName;
  if (body.jobType !== undefined) mapped.job_type_mongo_id = body.jobType;
  if (body.truckLoadDate !== undefined) mapped.truck_load_date = body.truckLoadDate;
  if (body.weeksToBuild !== undefined) mapped.weeks_to_build = body.weeksToBuild;
  if (body.status !== undefined) mapped.status = body.status;
  if (body.probability !== undefined) mapped.probability = body.probability;
  if (body.cnc !== undefined) mapped.cnc = body.cnc;
  if (body.build !== undefined) mapped.build = body.build;
  if (body.paint !== undefined) mapped.paint = body.paint;
  if (body.av !== undefined) mapped.av = body.av;
  if (body.packAndLoad !== undefined) mapped.pack_and_load = body.packAndLoad;
  if (body.tradeOnsite !== undefined) mapped.trade_onsite = body.tradeOnsite;
  if (body.onsiteWeeks !== undefined) mapped.onsite_weeks = body.onsiteWeeks;
  if (body.installDeadline !== undefined) mapped.install_deadline = body.installDeadline;
  if (body.hrsEstOnly !== undefined) mapped.hrs_est_only = body.hrsEstOnly;
  if (body.pm !== undefined) mapped.pm = body.pm;
  if (body.notes !== undefined) mapped.notes = body.notes;
  if (body.curveMode !== undefined) mapped.curve_mode = body.curveMode;
  return mapped;
}

export function toJobType(row: any) {
  if (!row) return null;
  return {
    _id: row.mongo_id || row.id,
    id: row.mongo_id || row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toStaff(row: any, leaveRows: any[] = []) {
  if (!row) return null;
  return {
    _id: row.mongo_id || row.id,
    id: row.mongo_id || row.id,
    slug: row.slug,
    name: row.name,
    dailyHours: row.daily_hours,
    utilisation: row.utilisation,
    skills: row.skills,
    leave: leaveRows.map(l => ({
      _id: l.id,
      date: l.date,
      leaveType: l.leave_type,
      notes: l.notes,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toCurveLibrary(row: any) {
  if (!row) return null;
  return {
    _id: row.mongo_id || row.id,
    id: row.mongo_id || row.id,
    name: row.name,
    curves: row.curves,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toRow(row: any) {
  if (!row) return null;
  return {
    _id: row.mongo_id || row.id,
    id: row.mongo_id || row.id,
    sheet: row.sheet,
    rowNumber: row.row_number,
    excelRowIndex: row.excel_row_index,
    data: row.data,
    synced: row.synced,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
