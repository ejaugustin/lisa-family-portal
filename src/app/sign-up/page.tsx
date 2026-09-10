'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signUpAction, type FormState } from '../actions';
import { PasswordField } from '../_components/PasswordField';

export default function SignUp() {
  const [state, action, pending] = useActionState<FormState, FormData>(signUpAction, {});

  return (
    <main className="shell">
      <Link href="/" className="wordmark">
        Lisa <span>&amp; Me</span>
      </Link>
      <div className="card">
        <h1>Set up your account</h1>
        {/* Said plainly and up front: this account is the family member's, and
            the person being cared for never needs one. */}
        <p>
          This account is yours, not theirs. They will never need a password, and nothing here costs
          anything until you have connected with them and had a look around.
        </p>
        <form action={action}>
          <label htmlFor="fullName">Your name</label>
          <input id="fullName" name="fullName" type="text" autoComplete="name" required />
          <label htmlFor="email">Your email</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <PasswordField
            id="password"
            name="password"
            label="Choose a password"
            autoComplete="new-password"
            helpText="At least 12 characters, with a number in there somewhere."
          />
          <button type="submit" disabled={pending}>
            {pending ? 'Setting up…' : 'Create my account'}
          </button>
        </form>
        {state.error && <div className="error">{state.error}</div>}
      </div>
      <p className="footnote">
        Already set up? <Link href="/sign-in">Sign in</Link>
      </p>
    </main>
  );
}
