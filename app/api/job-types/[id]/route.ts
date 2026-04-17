import { NextRequest, NextResponse } from 'next/server';
import { supabase, toJobType } from '@/lib/supabase';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const { data, error } = await supabase.from('cp_job_types')
      .select('*').eq('mongo_id', id).single();
    if (error || !data) return NextResponse.json({ error: 'Job type not found' }, { status: 404 });
    return NextResponse.json(toJobType(data));
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    const body = await request.json();
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('cp_job_types')
      .update(updateData).eq('mongo_id', id).select().single();
    if (error || !data) return NextResponse.json({ error: 'Job type not found' }, { status: 404 });
    return NextResponse.json({ message: 'Job type updated successfully', jobType: toJobType(data) });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    // Check if any projects use this job type
    const { data: projects } = await supabase.from('cp_projects')
      .select('id').eq('job_type_mongo_id', id).limit(1);
    if (projects && projects.length > 0) {
      return NextResponse.json({ error: 'Cannot delete job type. It is being used by projects.', projectCount: projects.length }, { status: 400 });
    }
    // Soft delete
    const { data, error } = await supabase.from('cp_job_types')
      .update({ is_active: false, updated_at: new Date().toISOString() }).eq('mongo_id', id).select().single();
    if (error || !data) return NextResponse.json({ error: 'Job type not found' }, { status: 404 });
    return NextResponse.json({ message: 'Job type deleted successfully', jobType: toJobType(data) });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
}
