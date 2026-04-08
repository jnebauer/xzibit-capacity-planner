import { NextRequest, NextResponse } from 'next/server';
import { supabase, toProject, fromProject } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase.from('cp_projects')
      .select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json((data || []).map(toProject));
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch projects', details: error?.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const row = fromProject(body);
    // Generate a mongo_id-style identifier
    row.mongo_id = Date.now().toString(16) + Math.random().toString(16).slice(2, 10);
    const { data, error } = await supabase.from('cp_projects').insert(row).select().single();
    if (error) throw error;
    return NextResponse.json(toProject(data), { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create project', details: error?.message }, { status: 500 });
  }
}
