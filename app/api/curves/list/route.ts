import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Lightweight curve list — id, curve_id, version, job_type, task_type,
// curve_status, description. Cheaper than /api/curves which includes the full
// weeklyPercentages payload.
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('cp_curves')
      .select('id, curve_id, version, job_type, task_type, curve_type, curve_status, description, weekly_percentages')
      .order('job_type', { ascending: true })
      .order('task_type', { ascending: true });

    if (error) throw error;

    const curves = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      curveId: String(row.curve_id ?? ''),
      version: String(row.version ?? 'v1.0.0'),
      jobType: String(row.job_type ?? ''),
      taskType: String(row.task_type ?? ''),
      curveType: row.curve_type ? String(row.curve_type) : null,
      curveStatus: String(row.curve_status ?? 'Draft'),
      description: row.description ? String(row.description) : null,
      // Include weeklyPercentages so the registry grid can render sparklines
      weeklyPercentages:
        typeof row.weekly_percentages === 'string'
          ? JSON.parse(row.weekly_percentages)
          : (row.weekly_percentages ?? null),
    }));

    return NextResponse.json({ curves, total: curves.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch curves', details: message },
      { status: 500 }
    );
  }
}
