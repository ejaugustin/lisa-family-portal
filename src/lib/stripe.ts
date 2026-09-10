import 'server-only';
import Stripe from 'stripe';
import { billingEnv } from './env';

// Billing lives on the caregiver's account, never the senior's. Per the
// commercial model (lisa-architecture-decisions.md): the senior's app stays
// free and ungated forever, and delinquency degrades only this portal — Lisa
// keeps calling, reminding, and Get Help keeps working no matter what happens
// here.
//
// Two-step design, because the free trial starts when the senior's app first
// connects, not at signup:
//   1. Signup collects a payment method only (Checkout in 'setup' mode, $0
//      charged today) — this file's createSetupCheckoutSession/
//      confirmSetupSession.
//   2. The actual Subscription, with its trial, is created later, at the
//      moment the senior confirms the connection — this file's
//      createTrialSubscription. That moment happens on LISA-CIRCLE-001's
//      side (the backend Lambda that flips a link to 'connected'), not here
//      in the portal, so createTrialSubscription is written for that Lambda
//      to import/port, not called from portal code today.

// Settled by EJ 2026-09-05.
export const TRIAL_DAYS = 14;

let _stripe: Stripe | null = null;
function stripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(billingEnv('STRIPE_SECRET_KEY'));
  return _stripe;
}

/**
 * Finds the caregiver's Stripe Customer by the email Cognito verified, or
 * creates one. Email is unique per Cognito account (enforced at signup), so
 * it is a safe lookup key — this avoids storing a Stripe customer id
 * anywhere else until the real caregiver-profile table exists.
 */
async function findOrCreateCustomer(email: string, name: string): Promise<string> {
  const existing = await stripe().customers.list({ email, limit: 1 });
  if (existing.data[0]) return existing.data[0].id;
  const created = await stripe().customers.create({ email, name });
  return created.id;
}

/**
 * Starts the payment-method-on-file step. Nothing is charged here — this is
 * a SetupIntent under the hood, not a subscription.
 */
export async function createSetupCheckoutSession(input: {
  email: string;
  name: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const customerId = await findOrCreateCustomer(input.email, input.name);
  const session = await stripe().checkout.sessions.create({
    mode: 'setup',
    customer: customerId,
    payment_method_types: ['card'],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });
  if (!session.url) throw new Error('stripe_no_session_url');
  return session.url;
}

/**
 * Called from the return page after Stripe redirects back with
 * ?session_id=... . Verifies server-side against Stripe rather than trusting
 * the query string — the query string is attacker-visible browser state.
 */
export async function confirmSetupSession(
  sessionId: string,
): Promise<{ ok: boolean; customerId?: string }> {
  const session = await stripe().checkout.sessions.retrieve(sessionId, {
    expand: ['setup_intent'],
  });
  const setupIntent = session.setup_intent;
  const succeeded =
    typeof setupIntent === 'object' && setupIntent !== null && setupIntent.status === 'succeeded';
  if (!succeeded || typeof session.customer !== 'string') return { ok: false };
  return { ok: true, customerId: session.customer };
}

/**
 * NOT CALLED FROM THE PORTAL. Written here so the shape is settled, for
 * LISA-CIRCLE-001's backend Lambda to port when a link flips to 'connected'
 * — that is the event that starts the trial, per the commercial model, and
 * it happens on the senior's side, which this Next.js app has no hook into.
 * `trialDays` defaults to TRIAL_DAYS (14, settled by EJ 2026-09-05) — pass
 * it explicitly only to override.
 */
export async function createTrialSubscription(input: {
  customerId: string;
  priceId: string;
  trialDays?: number;
}): Promise<Stripe.Subscription> {
  return stripe().subscriptions.create({
    customer: input.customerId,
    items: [{ price: input.priceId }],
    trial_period_days: input.trialDays ?? TRIAL_DAYS,
  });
}
