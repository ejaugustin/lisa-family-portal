'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { forgotPasswordAction, type FormState } from '../actions';

export default function ForgotPassword() {
  const [state, action, pending] = useActionState<FormState, FormData>(forgotPasswordAction, {});

  return (
    <main className="shell">
      <Link href="/" className="wordmark">
        Lisa <span>&amp; Me</span>
      </Link>
      <div className="card">
        <h1>Reset your password</h1>
        <p>Tell us the email you signed up with and we will send a code to reset it.</p>
        <form action={action}>
          <label htmlFor="email">Your email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <button type="submit" disabled={pending}>
            {pending ? 'Sending…' : 'Send me a code'}
          </button>
        </form>
        {state.error && <div className="error">{state.error}</div>}
      </div>
      <div className="notice" style={{ maxWidth: 400, marginTop: 24 }}>
        <h3>Your person is fine either way</h3>
        <p>
          Locking yourself out of the portal never pauses anything Lisa does. She keeps calling,
          keeps reminding, and Get Help keeps working while you sort this out.
        </p>
      </div>
      <p className="footnote">
        Remembered it after all? <Link href="/sign-in">Sign in</Link>
      </p>
    </main>
  );
}
