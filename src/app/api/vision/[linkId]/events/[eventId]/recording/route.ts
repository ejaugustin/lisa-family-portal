import { currentCaregiver } from '@/lib/session';
import { getVisionRecording } from '@/lib/vision';

export const dynamic = 'force-dynamic';
export async function GET(_request: Request, context: { params: Promise<{ linkId: string; eventId: string }> }) {
  const headers = { 'cache-control': 'no-store', 'content-type': 'application/json' };
  if (!await currentCaregiver()) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers });
  const { linkId, eventId } = await context.params;
  try {
    const result = await getVisionRecording(linkId, eventId);
    if (!result.ok) return new Response(JSON.stringify({ error: result.status === 403 ? 'access_denied' : 'recording_unavailable' }), { status: result.status, headers });
    return new Response(await result.text(), { headers });
  } catch {
    return new Response(JSON.stringify({ error: 'recording_unavailable' }), { status: 503, headers });
  }
}
