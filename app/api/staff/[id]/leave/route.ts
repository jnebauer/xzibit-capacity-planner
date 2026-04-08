import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const leaveData = await request.json();
    if (!leaveData.date || !leaveData.leaveType) {
      return NextResponse.json({ error: 'Date and leave type are required' }, { status: 400 });
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(leaveData.date)) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
    }
    // Check staff exists
    const { data: staff } = await supabase.from('cp_staff').select('id').eq('mongo_id', params.id).single();
    if (!staff) return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });

    // Check for duplicate
    const { data: existing } = await supabase.from('cp_staff_leave')
      .select('id').eq('staff_mongo_id', params.id).eq('date', leaveData.date).single();
    if (existing) return NextResponse.json({ error: 'Leave date already exists for this staff member' }, { status: 409 });

    const { error } = await supabase.from('cp_staff_leave').insert({
      staff_mongo_id: params.id,
      date: leaveData.date,
      leave_type: leaveData.leaveType,
      notes: leaveData.notes || '',
    });
    if (error) throw error;

    const { data: allLeave } = await supabase.from('cp_staff_leave')
      .select('*').eq('staff_mongo_id', params.id);
    return NextResponse.json({
      message: 'Leave date added successfully',
      leave: (allLeave || []).map(l => ({ _id: l.id, date: l.date, leaveType: l.leave_type, notes: l.notes }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
}
