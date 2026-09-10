import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { currentCaregiver } from '@/lib/session';
import { confirmSetupSession } from '@/lib/stripe';

// The success page is the only place billing state gets written — the query
// string Stripe redirects back with is never trusted on its own; the session
// id in it is looked up against Stripe's own record before anything counts as
// paid. Mirrors session.ts: httpOnly, no Domain attribute, host-only to this
// portal.
//
// This cookie is an MVP stand-in, same spirit as circle-preview.ts — the real
// source of truth should end up wherever the caregiver's profile eventually
// lives (once LISA-CIRCLE-001's backend owns it), not a browser cookie. Until
// then it is enough to gate the PORTAL, which is the only thing billing is
// allowed to gate.
export default async function BillingSuccess({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const caregiver = await currentCaregiver();
  if (!caregiver) redirect('/sign-in');

  const { session_id: sessionId } = await searchParams;
  if (!sessionId) redirect('/billing/start?error=1');

  const result = await confirmSetupSession(sessionId);
  if (!result.ok) redirect('/billing/start?error=1');

  const jar = await cookies();
  jar.set('lisa_billing', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect('/dashboard');
}
