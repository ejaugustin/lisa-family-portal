import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const headers = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-robots-tag': 'noindex, nofollow' };
  if (!/^[A-Za-z0-9_-]{43}$/.test(code)) return NextResponse.json({ error: 'unavailable' }, { status: 404, headers });
  try {
    const response = await fetch(`${env('LISA_API_URL').replace(/\/+$/, '')}/vision/shared/${code}`, {
      cache: 'no-store', signal: AbortSignal.timeout(15000), redirect: 'error',
    });
    if (!response.ok) return NextResponse.json({ error: 'unavailable' }, { status: response.status === 404 ? 404 : 503, headers });
    return NextResponse.json(await response.json(), { headers });
  } catch { return NextResponse.json({ error: 'unavailable' }, { status: 503, headers }); }
}
