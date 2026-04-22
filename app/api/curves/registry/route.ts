import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/auth';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('cp_curve_registry')
      .select('id, job_type, task_type, default_curve_id, reason, created_at, updated_at')
      .order('job_type', { ascending: true })
      .order('task_type', { ascending: true });

    if (error) throw error;

    const registry = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      jobType: String(row.job_type ?? ''),
      taskType: String(row.task_type ?? ''),
      defaultCurveId: String(row.default_curve_id ?? ''),
      reason: row.reason ? String(row.reason) : null,
      createdAt: row.created_at ? String(row.created_at) : null,
      updatedAt: row.updated_at ? String(row.updated_at) : null,
    }));

    return NextResponse.json({ registry, total: registry.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch registry', details: message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { jobType, taskType, defaultCurveId, reason } = body ?? {};

    if (!jobType || typeof jobType !== 'string') {
      return NextResponse.json({ error: 'jobType is required' }, { status: 400 });
    }
    if (!taskType || typeof taskType !== 'string') {
      return NextResponse.json({ error: 'taskType is required' }, { status: 400 });
    }
    if (!defaultCurveId || typeof defaultCurveId !== 'string') {
      return NextResponse.json({ error: 'defaultCurveId is required' }, { status: 400 });
    }
    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 });
    }

    // Confirm the curve exists and is Active
    const { data: curveCheck, error: curveErr } = await supabase
      .from('cp_curves')
      .select('curve_id, curve_status')
      .eq('curve_id', defaultCurveId)
      .single();

    if (curveErr || !curveCheck) {
      return NextResponse.json({ error: 'Curve not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Upsert: update if exists, insert if not
    const { data: existing } = await supabase
      .from('cp_curve_registry')
      .select('id')
      .eq('job_type', jobType)
      .eq('task_type', taskType)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('cp_curve_registry')
        .update({
          default_curve_id: defaultCurveId,
          reason: reason.trim(),
          updated_at: now,
        })
        .eq('job_type', jobType)
        .eq('task_type', taskType)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('cp_curve_registry')
        .insert({
          job_type: jobType,
          task_type: taskType,
          default_curve_id: defaultCurveId,
          reason: reason.trim(),
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({
      id: result.id,
      jobType: result.job_type,
      taskType: result.task_type,
      defaultCurveId: result.default_curve_id,
      reason: result.reason,
      updatedAt: result.updated_at,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update registry', details: message },
      { status: 500 }
    );
  }
}
