// Configuration that must exist before anything works.
//
// This used to be checked inside cognito.ts, which meant the first sign someone
// had of a missing value was a stack trace AFTER they had filled in a whole
// signup form. Checked here and read by the root layout instead, so a missing
// value is obvious on the first page load and says exactly what to do.

export const REQUIRED_ENV = [
  'COGNITO_USER_POOL_ID',
  'COGNITO_CLIENT_ID',
  'COGNITO_CLIENT_SECRET',
  'AWS_REGION',
  'LISA_API_URL',
] as const;

/** Placeholder values copied from .env.example count as missing. */
export function missingEnv(): string[] {
  return REQUIRED_ENV.filter((name) => {
    const value = process.env[name];
    if (!value || !value.trim()) return true;
    return value.includes('xxxx');
  });
}

export function env(name: (typeof REQUIRED_ENV)[number]): string {
  const value = process.env[name];
  if (!value || !value.trim() || value.includes('xxxx')) {
    throw new Error(`Missing env var ${name} — see .env.example`);
  }
  return value;
}

// Stripe is NOT in REQUIRED_ENV / missingEnv() above: those gate the whole
// app (sign-in, the senior's data, everything) behind Cognito being
// configured, and billing must never be that kind of hard dependency — a
// caregiver who is already paying must still be able to sign in and see her
// mother's status even if a Stripe key gets misconfigured. This throws its
// own clearly-named error instead, for the one screen (billing/start) that
// actually needs it to catch and explain.
export class BillingNotConfigured extends Error {
  constructor() {
    super('billing_not_configured');
  }
}

export function billingEnv(name: 'STRIPE_SECRET_KEY'): string {
  const value = process.env[name];
  if (!value || !value.trim() || value.includes('xxxx')) throw new BillingNotConfigured();
  return value;
}
