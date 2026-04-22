import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/auth';

const VALID_TYPES = new Set(['Public Holiday', 'Christmas Shutdown', 'Workshop Maintenance', 'Other']);

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, startDate, endDate, closureType, notes } = body ?? {};

    if (endDate && startDate && endDate < startDate) {
      return NextResponse.json({ error: 'endDate must be ≥ startDate' }, { status: 400 });
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = String(name).trim();
    if (startDate !== undefined) updates.start_date = startDate;
    if (endDate !== undefined) updates.end_date = endDate;
    if (closureType !== undefined) updates.closure_type = VALID_TYPES.has(closureType) ? closureType : 'Other';
    if (notes !== undefined) updates.notes = notes ? String(notes).trim() : null;

    const { data, error } = await supabase
      .from('cp_company_closures')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Closure not found' }, { status: 404 });

    const row = data as Record<string, unknown>;
    return NextResponse.json({
      id: row.id,
      name: String(row.name ?? ''),
      startDate: String(row.start_date ?? ''),
      endDate: String(row.end_date ?? ''),
      closureType: String(row.closure_type ?? 'Other'),
      notes: row.notes ? String(row.notes) : null,
      updatedAt: row.updated_at ? String(row.updated_at) : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update closure', details: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  }

  try {
    const { id } = await context.params;

    const { error } = await supabase
      .from('cp_company_closures')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ deleted: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete closure', details: message },
      { status: 500 }
    );
  }
}
