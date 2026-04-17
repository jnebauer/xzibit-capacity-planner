import { NextRequest, NextResponse } from 'next/server';
import { supabase, toProject, fromProject } from '@/lib/supabase';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const { data, error } = await supabase.from('cp_projects')
      .select('*').eq('mongo_id', id).single();
    if (error || !data) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    return NextResponse.json(toProject(data));
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch project', details: error?.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const body = await request.json();
    const updateData = fromProject(body);
    updateData.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from('cp_projects')
      .update(updateData).eq('mongo_id', id).select().single();
    if (error || !data) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    return NextResponse.json(toProject(data));
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update project', details: error?.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const { data, error } = await supabase.from('cp_projects')
      .delete().eq('mongo_id', id).select().single();
    if (error || !data) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete project', details: error?.message }, { status: 500 });
  }
}
