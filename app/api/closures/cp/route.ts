import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/auth';

function mapClosure(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: String(row.name ?? ''),
    startDate: String(row.start_date ?? ''),
    endDate: String(row.end_date ?? ''),
    closureType: String(row.closure_type ?? 'Other'),
    notes: row.notes ? String(row.notes) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('cp_company_closures')
      .select('*')
      .order('start_date', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      closures: (data || []).map((row: Record<string, unknown>) => mapClosure(row)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch closures', details: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, startDate, endDate, closureType, notes } = body ?? {};

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!startDate || typeof startDate !== 'string') {
      return NextResponse.json({ error: 'startDate is required (YYYY-MM-DD)' }, { status: 400 });
    }
    if (!endDate || typeof endDate !== 'string') {
      return NextResponse.json({ error: 'endDate is required (YYYY-MM-DD)' }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: 'endDate must be ≥ startDate' }, { status: 400 });
    }

    const VALID_TYPES = new Set(['Public Holiday', 'Christmas Shutdown', 'Workshop Maintenance', 'Other']);
    const type = closureType && VALID_TYPES.has(closureType) ? closureType : 'Other';

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('cp_company_closures')
      .insert({
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        closure_type: type,
        notes: notes ? String(notes).trim() : null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(mapClosure(data as Record<string, unknown>), { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create closure', details: message },
      { status: 500 }
    );
  }
}
