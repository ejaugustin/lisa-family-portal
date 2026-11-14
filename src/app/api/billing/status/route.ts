import { currentCaregiver } from '@/lib/session';
import { hasSavedPaymentMethod } from '@/lib/stripe';

export const dynamic = 'force-dynamic';
export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store' };
  const caregiver = await currentCaregiver();
  if (!caregiver) return Response.json({ error: 'unauthorized' }, { status: 401, headers });
  try {
    return Response.json({ ready: await hasSavedPaymentMethod(caregiver.email) }, { headers });
  } catch {
    return Response.json({ error: 'billing_unavailable' }, { status: 503, headers });
  }
}
