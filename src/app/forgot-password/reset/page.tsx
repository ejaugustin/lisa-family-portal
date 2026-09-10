'use client';

import { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { resetPasswordAction, type FormState } from '../../actions';
import { PasswordField } from '../../_components/PasswordField';

function ResetForm() {
  const email = useSearchParams().get('email') ?? '';
  const [state, action, pending] = useActionState<FormState, FormData>(resetPasswordAction, {});

  return (
    <main className="shell">
      <span className="wordmark">
        Lisa <span>&amp; Me</span>
      </span>
      <div className="card">
        <h1>Check your email</h1>
        <p>
          If there is an account for <strong>{email || 'that address'}</strong>, a six-digit code is on
          its way. Pop it in below along with a new password.
        </p>
        <form action={action}>
          <input type="hidden" name="email" value={email} />
          <label htmlFor="code">The code</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
          <PasswordField
            id="password"
            name="password"
            label="New password"
            autoComplete="new-password"
            helpText="At least 12 characters, with a number in there somewhere."
          />
          <button type="submit" disabled={pending}>
            {pending ? 'Resetting…' : 'Set my new password'}
          </button>
        </form>
        {state.error && <div className="error">{state.error}</div>}
      </div>
      <p className="footnote">
        Didn&apos;t get a code? <Link href="/forgot-password">Try again</Link>
      </p>
    </main>
  );
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<main className="shell" />}>
      <ResetForm />
    </Suspense>
  );
}
