'use client';

import { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { resendAction, verifyAction, type FormState } from '../actions';

function VerifyForm() {
  const email = useSearchParams().get('email') ?? '';
  const [state, action, pending] = useActionState<FormState, FormData>(verifyAction, {});
  const [resendState, resend] = useActionState<FormState, FormData>(resendAction, {});

  return (
    <main className="shell">
      <span className="wordmark">
        Lisa <span>&amp; Me</span>
      </span>
      <div className="card">
        <h1>Check your email</h1>
        <p>
          We have sent a six-digit code to <strong>{email || 'your email address'}</strong>. Pop it in
          below and you are done.
        </p>
        <form action={action}>
          <input type="hidden" name="email" value={email} />
          <label htmlFor="code">The code</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
          <button type="submit" disabled={pending}>
            {pending ? 'Checking…' : 'Confirm'}
          </button>
        </form>
        {state.error && <div className="error">{state.error}</div>}
        {resendState.notice && <div className="error">{resendState.notice}</div>}
        {resendState.error && <div className="error">{resendState.error}</div>}
      </div>
      <form action={resend} className="footnote">
        <input type="hidden" name="email" value={email} />
        <button type="submit" style={{ background: 'transparent', color: 'var(--accent)', width: 'auto' }}>
          Send the code again
        </button>
      </form>
    </main>
  );
}

export default function Verify() {
  return (
    <Suspense fallback={<main className="shell" />}>
      <VerifyForm />
    </Suspense>
  );
}
