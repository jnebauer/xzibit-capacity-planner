import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string; date: string }> }) {
  const { id, date } = await context.params;
  try {
    const decodedDate = decodeURIComponent(date);
    const { data: staff } = await supabase.from('cp_staff').select('id').eq('mongo_id', id).single();
    if (!staff) return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });

    const { data: leave } = await supabase.from('cp_staff_leave')
      .select('id').eq('staff_mongo_id', id).eq('date', decodedDate).single();
    if (!leave) return NextResponse.json({ error: 'Leave date not found' }, { status: 404 });

    await supabase.from('cp_staff_leave').delete().eq('id', leave.id);

    const { data: allLeave } = await supabase.from('cp_staff_leave')
      .select('*').eq('staff_mongo_id', id);
    return NextResponse.json({
      message: 'Leave date removed successfully',
      leave: (allLeave || []).map(l => ({ _id: l.id, date: l.date, leaveType: l.leave_type, notes: l.notes }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
}
