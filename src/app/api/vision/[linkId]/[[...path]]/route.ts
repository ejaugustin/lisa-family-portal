import { currentCaregiver } from '@/lib/session';
import { caregiverFetch } from '@/lib/vision';
import { visionMutationOriginAllowed } from '@/lib/vision-origin';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ linkId: string; path?: string[] }> };
async function proxy(request: Request, context: Context) {
  const headers = { 'cache-control': 'no-store', 'content-type': 'application/json' };
  if (!await currentCaregiver()) return Response.json({ error: 'unauthorized' }, { status: 401, headers });
  const { linkId, path = [] } = await context.params;
  const route = path.join('/');
  if (!/^(?:|events|live-sessions(?:\/[a-zA-Z0-9_-]+(?:\/(?:renew|signals))?)?)$/.test(route)) return Response.json({ error: 'not_found' }, { status: 404, headers });
  if (request.method !== 'GET' && !visionMutationOriginAllowed(request)) return Response.json({ error: 'origin_denied' }, { status: 403, headers });
  if (request.method !== 'GET' && !route.startsWith('live-sessions')) return Response.json({ error: 'method_not_allowed' }, { status: 405, headers });
  const body = request.method === 'POST' ? await request.text() : undefined;
  if (body && body.length > 80000) return Response.json({ error: 'too_large' }, { status: 413, headers });
  try {
    const query = new URL(request.url).search;
    const response = await caregiverFetch(`/caregiver/links/${encodeURIComponent(linkId)}/vision${route ? '/' + path.map(encodeURIComponent).join('/') : ''}${query}`, { method: request.method, body });
    return new Response(await response.text(), { status: response.status, headers });
  } catch { return Response.json({ error: 'service_unavailable' }, { status: 503, headers }); }
}
export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
