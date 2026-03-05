import { NextRequest, NextResponse } from 'next/server';
import { fetchMedicalDiagram } from '@/lib/ai/diagrams';
import { requireAuth, handleAuthError } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const q = new URL(req.url).searchParams.get('q');
    if (!q?.trim()) return NextResponse.json({ error: 'q required' }, { status: 400 });

    const imageUrl = await fetchMedicalDiagram(q.trim());
    return NextResponse.json({ imageUrl });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    throw error;
  }
}
