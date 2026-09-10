import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { currentCaregiver } from '@/lib/session';
import { confirmSetupSession } from '@/lib/stripe';

// Route handler, not a page — Next.js 15 refuses to let a Server Component
// set cookies during render ("Cookies can only be modified in a Server
// Action or Route Handler"), and this is the one place billing state gets
// written. The query string Stripe redirects back with is never trusted on
// its own; the session id in it is looked up against Stripe's own record
// before anything counts as paid. Mirrors session.ts: httpOnly, no Domain
// attribute, host-only to this portal.
//
// This cookie is an MVP stand-in, same spirit as circle-preview.ts — the
// real source of truth should end up wherever the caregiver's profile
// eventually lives (once LISA-CIRCLE-001's backend owns it), not a browser
// cookie. Until then it is enough to gate the PORTAL, which is the only
// thing billing is allowed to gate.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = request.nextUrl.origin;

  const caregiver = await currentCaregiver();
  if (!caregiver) return NextResponse.redirect(new URL('/sign-in', origin));

  const sessionId = request.nextUrl.searchParams.get('session_id');
  if (!sessionId) return NextResponse.redirect(new URL('/billing/start?error=1', origin));

  const result = await confirmSetupSession(sessionId);
  if (!result.ok) return NextResponse.redirect(new URL('/billing/start?error=1', origin));

  const jar = await cookies();
  jar.set('lisa_billing', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.redirect(new URL('/dashboard', origin));
}
