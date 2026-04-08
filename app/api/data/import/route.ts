import { NextRequest, NextResponse } from 'next/server';
import { supabase, toProject, toStaff } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projects, staff } = body;

    let projectsCount = 0;
    let staffCount = 0;

    if (projects && Array.isArray(projects) && projects.length > 0) {
      // Clear existing projects
      await supabase.from('cp_projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      const projectDocuments = projects.map((project: any) => ({
        mongo_id: project.id || (Date.now().toString(16) + Math.random().toString(16).slice(2, 10)),
        job_number: project.id || '',
        job_name: project.name || '',
        truck_load_date: project.truckDate || null,
        weeks_to_build: project.weeksBefore || 0,
        cnc: project.hoursBySkill?.CNC || 0,
        build: project.hoursBySkill?.Build || 0,
        paint: project.hoursBySkill?.Paint || 0,
        av: project.hoursBySkill?.AV || 0,
        pack_and_load: project.hoursBySkill?.['Pack & Load'] || 0,
        trade_onsite: project.onsite?.hours || 0,
        onsite_weeks: project.onsite?.weeks || 0,
        probability: project.probability || null,
        curve_mode: project.curveMode || 'Mathematician',
      }));

      const { error } = await supabase.from('cp_projects').insert(projectDocuments);
      if (error) throw error;
      projectsCount = projects.length;
    }

    if (staff && Array.isArray(staff) && staff.length > 0) {
      // Clear existing staff and leave
      await supabase.from('cp_staff_leave').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('cp_staff').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      for (const member of staff) {
        const mongoId = member.id || (Date.now().toString(16) + Math.random().toString(16).slice(2, 10));
        const { error } = await supabase.from('cp_staff').insert({
          mongo_id: mongoId,
          slug: member.id || member.name.toLowerCase().replace(/\s+/g, '_'),
          name: member.name,
          daily_hours: member.dailyHours || 8,
          utilisation: member.utilisation || 0.85,
          skills: member.skills || { CNC: false, Build: false, Paint: false, AV: false, 'Pack & Load': false },
        });
        if (error) throw error;

        if (member.leave && Array.isArray(member.leave)) {
          for (const leave of member.leave) {
            await supabase.from('cp_staff_leave').insert({
              staff_mongo_id: mongoId,
              date: leave.date,
              leave_type: leave.leaveType || 'Annual',
              notes: leave.notes || '',
            });
          }
        }
        staffCount++;
      }
    }

    return NextResponse.json({ success: true, message: 'Data imported successfully', projectsCount, staffCount });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to import data', details: error?.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data: projects } = await supabase.from('cp_projects').select('*').order('job_number', { ascending: true });
    const { data: staffData } = await supabase.from('cp_staff').select('*').order('name', { ascending: true });
    const { data: leaveData } = await supabase.from('cp_staff_leave').select('*');

    const leaveByStaff: Record<string, any[]> = {};
    (leaveData || []).forEach(l => {
      if (!leaveByStaff[l.staff_mongo_id]) leaveByStaff[l.staff_mongo_id] = [];
      leaveByStaff[l.staff_mongo_id].push(l);
    });

    return NextResponse.json({
      projects: (projects || []).map(toProject),
      staff: (staffData || []).map(s => toStaff(s, leaveByStaff[s.mongo_id] || [])),
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch data', details: error?.message }, { status: 500 });
  }
}
