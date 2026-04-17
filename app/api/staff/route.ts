import { NextRequest, NextResponse } from 'next/server';
import { supabase, toStaff } from '@/lib/supabase';

function normalizeUtilisation(value: any) {
  const numeric = Number(value ?? 0.85);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0.85;
  return numeric > 1 ? Math.min(numeric / 100, 1) : Math.min(numeric, 1);
}

export async function GET() {
  try {
    const { data: staffData, error } = await supabase.from('cp_staff')
      .select('*').order('name', { ascending: true });
    if (error) throw error;

    // Fetch all leave records
    const { data: leaveData } = await supabase.from('cp_staff_leave').select('*');
    const leaveByStaff: Record<string, any[]> = {};
    (leaveData || []).forEach(l => {
      if (!leaveByStaff[l.staff_mongo_id]) leaveByStaff[l.staff_mongo_id] = [];
      leaveByStaff[l.staff_mongo_id].push(l);
    });

    return NextResponse.json((staffData || []).map(s => toStaff(s, leaveByStaff[s.mongo_id] || [])));
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch staff', details: error?.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const mongoId = Date.now().toString(16) + Math.random().toString(16).slice(2, 10);
    const { data, error } = await supabase.from('cp_staff').insert({
      mongo_id: mongoId,
      slug: body.slug || body.name.toLowerCase().replace(/\s+/g, '_'),
      name: body.name,
      daily_hours: body.dailyHours || 8,
      utilisation: normalizeUtilisation(body.utilisation),
      employee_type: body.employeeType === 'contractor' ? 'contractor' : 'employee',
      skills: body.skills || { CNC: false, Build: false, Paint: false, AV: false, 'Pack & Load': false },
    }).select().single();

    if (error) throw error;
    return NextResponse.json(toStaff(data, []), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create staff', details: error?.message }, { status: 500 });
  }
}
