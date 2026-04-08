import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sheetSlug } = body;

    let query = supabase.from('cp_rows').delete();
    if (sheetSlug) {
      query = query.eq('sheet', sheetSlug);
    } else {
      // Delete all rows - use a condition that matches everything
      query = query.neq('id', '00000000-0000-0000-0000-000000000000');
    }

    const { error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Successfully cleared rows${sheetSlug ? ` for sheet: ${sheetSlug}` : ' for all sheets'}`,
      sheetSlug: sheetSlug || 'all'
    });
  } catch (error: any) {
    console.error('Clear data failed:', error);
    return NextResponse.json({ success: false, message: error?.message }, { status: 500 });
  }
}
