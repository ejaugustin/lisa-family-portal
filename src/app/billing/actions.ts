'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';
import { createSetupCheckoutSession } from '@/lib/stripe';
import { BillingNotConfigured } from '@/lib/env';

export type BillingState = { error?: string };

/**
 * Builds an absolute URL back to this app from the incoming request — no
 * separate "app base URL" env var to keep in sync across environments.
 *
 * `x-forwarded-proto` is set by the real load balancer in every deployed
 * environment, so it's trusted first. Defaulting the fallback to 'https'
 * broke local `npm run dev`: Stripe would build a `https://localhost:3000/...`
 * success_url, the browser has nothing listening there, and the redirect
 * back from Stripe silently failed — the card saved on Stripe's side, but
 * `lisa_billing` never got set, so the caregiver bounced back to
 * /billing/start looking stuck. Fall back to NODE_ENV instead of a bare
 * default so dev keeps working without touching the trusted-header path.
 *
 * HOST FIX (2026-09-10): on Amplify Hosting's WEB_COMPUTE compute, the plain
 * `host` header Next.js sees is the internal bind address the Lambda proxy
 * forwards requests to (`localhost:3000`), not the public hostname — the
 * real one arrives as `x-forwarded-host`. Using bare `host` built
 * `https://localhost:3000/...` success_urls in production itself, not just
 * locally: the card saved fine on Stripe's side, but the return redirect hit
 * a server that doesn't exist, `lisa_billing` never got set, and the
 * caregiver was sent back to /billing/start on every single visit —
 * indistinguishable from Stripe "not remembering" the card. `x-forwarded-host`
 * is checked first now; bare `host` is still the fallback for local dev,
 * where nothing sets `x-forwarded-host`.
 */
async function origin(): Promise<string> {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const host = h.get('x-forwarded-host') ?? h.get('host');
  return `${proto}://${host}`;
}

export async function startBillingAction(): Promise<void> {
  const caregiver = await currentCaregiver();
  if (!caregiver) redirect('/sign-in');

  const base = await origin();
  let url: string;
  try {
    url = await createSetupCheckoutSession({
      email: caregiver.email,
      name: caregiver.name,
      successUrl: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${base}/billing/start?cancelled=1`,
    });
  } catch (err) {
    if (err instanceof BillingNotConfigured) redirect('/billing/start?unavailable=1');
    redirect('/billing/start?error=1');
  }
  redirect(url);
}
