import { NextRequest, NextResponse } from 'next/server';
import { supabase, toStaff } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabase.from('cp_staff')
      .select('*').eq('mongo_id', params.id).single();
    if (error || !data) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    const { data: leaveData } = await supabase.from('cp_staff_leave')
      .select('*').eq('staff_mongo_id', params.id);
    return NextResponse.json(toStaff(data, leaveData || []));
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch staff', details: error?.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const updateData: any = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updateData.name = body.name;
    if (body.dailyHours !== undefined) updateData.daily_hours = body.dailyHours;
    if (body.utilisation !== undefined) updateData.utilisation = body.utilisation;
    if (body.skills !== undefined) updateData.skills = body.skills;
    if (body.slug !== undefined) updateData.slug = body.slug;

    const { data, error } = await supabase.from('cp_staff')
      .update(updateData).eq('mongo_id', params.id).select().single();
    if (error || !data) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    const { data: leaveData } = await supabase.from('cp_staff_leave')
      .select('*').eq('staff_mongo_id', params.id);
    return NextResponse.json(toStaff(data, leaveData || []));
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update staff', details: error?.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Delete leave records first
    await supabase.from('cp_staff_leave').delete().eq('staff_mongo_id', params.id);
    const { data, error } = await supabase.from('cp_staff')
      .delete().eq('mongo_id', params.id).select().single();
    if (error || !data) return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
    return NextResponse.json({ message: 'Staff deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to delete staff', details: error?.message }, { status: 500 });
  }
}
