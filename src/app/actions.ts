'use server';

import { redirect } from 'next/navigation';
import * as cognito from '@/lib/cognito';
import { clearSession, setSession } from '@/lib/session';

export type FormState = { error?: string; notice?: string };

export async function signInAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return { error: 'Please fill in both boxes.' };

  try {
    const tokens = await cognito.signIn(email, password);
    await setSession(tokens);
  } catch (err) {
    if ((err as { name?: string })?.name === 'UserNotConfirmedException') {
      redirect(`/verify?email=${encodeURIComponent(email)}`);
    }
    // TEMPORARY DIAGNOSTIC (2026-09-10): appends the raw error so we can see
    // what's actually failing in production, since Amplify isn't surfacing
    // CloudWatch logs for this app. Remove the [debug: ...] suffix once the
    // sign-in crash is diagnosed and fixed.
    const debug = err instanceof Error ? err.message : JSON.stringify(err);
    return { error: `${cognito.readableAuthError(err)} [debug: ${debug}]` };
  }
  redirect('/dashboard');
}

export async function signUpAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  const fullName = String(form.get('fullName') ?? '').trim();
  if (!email || !password || !fullName) return { error: 'Please fill in all three boxes.' };
  if (password.length < 12) return { error: 'Use at least 12 characters, with a number in there somewhere.' };

  try {
    await cognito.signUp(email, password, fullName);
  } catch (err) {
    return { error: cognito.readableAuthError(err) };
  }
  redirect(`/verify?email=${encodeURIComponent(email)}`);
}

export async function verifyAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const code = String(form.get('code') ?? '').trim();
  if (!code) return { error: 'Pop in the code we emailed you.' };

  try {
    await cognito.confirmSignUp(email, code);
  } catch (err) {
    return { error: cognito.readableAuthError(err) };
  }
  redirect('/sign-in?verified=1');
}

export async function resendAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  try {
    await cognito.resendCode(email);
  } catch (err) {
    return { error: cognito.readableAuthError(err) };
  }
  return { notice: 'Sent — it should arrive in a minute or two.' };
}

export async function forgotPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  if (!email) return { error: 'Pop in the email you signed up with.' };

  try {
    await cognito.startPasswordReset(email);
  } catch (err) {
    // Never reveal whether an account exists — same message either way.
    if ((err as { name?: string })?.name === 'UserNotFoundException') {
      redirect(`/forgot-password/reset?email=${encodeURIComponent(email)}`);
    }
    return { error: cognito.readableAuthError(err) };
  }
  redirect(`/forgot-password/reset?email=${encodeURIComponent(email)}`);
}

export async function resetPasswordAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const code = String(form.get('code') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!code) return { error: 'Pop in the code we emailed you.' };
  if (password.length < 12) return { error: 'Use at least 12 characters, with a number in there somewhere.' };

  try {
    await cognito.finishPasswordReset(email, code, password);
  } catch (err) {
    return { error: cognito.readableAuthError(err) };
  }
  redirect('/sign-in?reset=1');
}

export async function signOutAction(): Promise<void> {
  await clearSession();
  redirect('/sign-in');
}
