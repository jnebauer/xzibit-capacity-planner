import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Read-only view of the shared company_closures table.
// This table is owned by the Milestone Calculator — do NOT write to it here.
export async function GET(request: NextRequest) {
  try {
    const jurisdictions = (request.nextUrl.searchParams.get('jurisdictions') || 'national')
      .split(',')
      .map((j) => j.trim())
      .filter(Boolean);

    const { data, error } = await supabase
      .from('company_closures')
      .select('id, name, description, date, jurisdiction, closure_type, active, created_at')
      .in('jurisdiction', jurisdictions)
      .or('active.is.null,active.eq.true')
      .order('date', { ascending: true });

    if (error) throw error;

    const closures = (data || []).map((row: Record<string, unknown>) => ({
      id: row.id,
      name: String(row.name ?? row.description ?? ''),
      date: String(row.date ?? ''),
      jurisdiction: String(row.jurisdiction ?? ''),
      closureType: String(row.closure_type ?? 'Public Holiday'),
      active: row.active !== false,
    }));

    return NextResponse.json({ closures, total: closures.length, jurisdictions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch shared closures', details: message },
      { status: 500 }
    );
  }
}
