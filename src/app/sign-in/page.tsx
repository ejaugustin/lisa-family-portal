'use client';

import { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signInAction, type FormState } from '../actions';
import { PasswordField } from '../_components/PasswordField';

function SignInForm() {
  const params = useSearchParams();
  const [state, action, pending] = useActionState<FormState, FormData>(signInAction, {});

  return (
    <main className="shell">
      <Link href="/" className="wordmark">
        Lisa <span>&amp; Me</span>
      </Link>
      <div className="card">
        <h1>Welcome back</h1>
        <p>Sign in to see how your person is getting on.</p>
        {params.get('verified') === '1' && (
          <div className="error" style={{ background: 'var(--confirm-tint)', borderColor: 'var(--confirm-tint-line)', color: 'var(--confirm-dark)' }}>
            Email confirmed — go ahead and sign in.
          </div>
        )}
        {params.get('reset') === '1' && (
          <div className="error" style={{ background: 'var(--confirm-tint)', borderColor: 'var(--confirm-tint-line)', color: 'var(--confirm-dark)' }}>
            Password reset — sign in with your new one.
          </div>
        )}
        <form action={action}>
          <label htmlFor="email">Your email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <PasswordField
            id="password"
            name="password"
            label="Password"
            autoComplete="current-password"
          />
          <button type="submit" disabled={pending}>
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        {state.error && <div className="error">{state.error}</div>}
        <p className="footnote" style={{ marginTop: 14 }}>
          <Link href="/forgot-password">Forgot your password?</Link>
        </p>
      </div>
      {/* Release-blocking per the design handoff (C3): a worried caregiver at
          3am must not believe the portal is the route to help. */}
      <div className="notice" style={{ maxWidth: 400, marginTop: 24 }}>
        <h3>If this is an emergency</h3>
        <p>Call 911 — don&apos;t spend time signing in. Lisa is already watching and will reach you either way.</p>
      </div>
      <p className="footnote">
        No account yet? <Link href="/sign-up">Set one up</Link>
      </p>
    </main>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<main className="shell" />}>
      <SignInForm />
    </Suspense>
  );
}
