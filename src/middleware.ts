import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// A cheap gate only: it checks that a session cookie EXISTS, never that it is
// valid — Edge middleware cannot reach Cognito's public keys cheaply, and a
// half-verification is worse than an honest one. Every page still calls
// currentCaregiver(), which verifies the signature properly. This exists so a
// signed-out visitor lands on the sign-in page instead of a flash of chrome.
//
// Same shape for billing: a signed-in caregiver with no payment method on
// file is sent to add one before anything else, because the caregiver-first
// commercial model is "sign up and pay to see how she's doing" — but /billing
// itself, and everything sign-in-adjacent, must stay reachable or nobody
// could ever complete either step.

const PUBLIC = ['/sign-in', '/sign-up', '/verify', '/forgot-password'];
const BILLING_EXEMPT = ['/billing', ...PUBLIC];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const hasSession = request.cookies.has('lisa_id');
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    return NextResponse.redirect(url);
  }

  if (!BILLING_EXEMPT.some((p) => pathname.startsWith(p))) {
    const hasPaymentMethod = request.cookies.has('lisa_billing');
    if (!hasPaymentMethod) {
      const url = request.nextUrl.clone();
      url.pathname = '/billing/start';
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
