import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { supabase, toRow } from '@/lib/supabase';

// Admin-only diagnostic endpoint: exposes cp_rows counts and sample data.
// Flagged for Joel's review — consider removing or restricting to non-production
// once the full auth rollout (Fix #3) is stable.
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { data: allRows, error } = await supabase.from('cp_rows').select('*').limit(5);
    if (error) throw error;

    let sheetCounts: unknown = null;
    try { const r = await supabase.rpc('get_cp_rows_sheet_counts'); sheetCounts = r.data; } catch (_) {}

    // Fallback: manual count per sheet
    const sheets = ['capacity', 'demand', 'supply', 'projects', 'staff', 'job-database'];
    const counts: Array<{ _id: string; count: number }> = [];
    for (const sheet of sheets) {
      const { count } = await supabase.from('cp_rows').select('*', { count: 'exact', head: true }).eq('sheet', sheet);
      if (count) counts.push({ _id: sheet, count });
    }

    void sheetCounts; // rpc result reserved for future use

    return NextResponse.json({
      success: true,
      totalRows: counts.reduce((sum, c) => sum + c.count, 0),
      sheetCounts: counts,
      sampleRows: (allRows || []).map(toRow),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
