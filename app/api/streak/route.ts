import { NextResponse } from 'next/server';
import { getStreakInfo } from '@/lib/streak';

export async function GET() {
  try {
    const info = await getStreakInfo();
    return NextResponse.json(info);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
