import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { currentCaregiver } from '@/lib/session';
import { confirmSetupSession } from '@/lib/stripe';

// Validate the completed setup against the authenticated account. The saved
// Stripe payment method is authoritative, including when this return is never
// visited. Clear the obsolete browser flag; it no longer grants portal access.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = request.nextUrl.origin;

  const caregiver = await currentCaregiver();
  if (!caregiver) return NextResponse.redirect(new URL('/sign-in', origin));

  const sessionId = request.nextUrl.searchParams.get('session_id');
  if (!sessionId) return NextResponse.redirect(new URL('/billing/start?error=1', origin));

  const result = await confirmSetupSession(sessionId, caregiver.email);
  if (!result.ok) return NextResponse.redirect(new URL('/billing/start?error=1', origin));

  const jar = await cookies();
  jar.delete('lisa_billing');

  return NextResponse.redirect(new URL('/dashboard', origin));
}
