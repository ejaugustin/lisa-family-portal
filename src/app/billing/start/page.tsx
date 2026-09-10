'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { startBillingAction } from '../actions';

function StartBillingBody() {
  const params = useSearchParams();

  return (
    <main className="shell">
      <span className="wordmark">
        Lisa <span>&amp; Me</span>
      </span>
      <div className="card">
        <h1>Add a payment method</h1>
        <p>
          One last step before you can see how your person is doing. Nothing is charged today — your
          free trial starts once you have connected with her, not before.
        </p>
        {params.get('cancelled') === '1' && (
          <div className="error">No trouble — pick it back up whenever you are ready.</div>
        )}
        {params.get('error') === '1' && (
          <div className="error">Something went wrong at our end. Try again in a moment.</div>
        )}
        {params.get('unavailable') === '1' && (
          <div className="error">
            Payment setup isn&apos;t available right now. Nothing about your account or hers is
            affected — try again shortly.
          </div>
        )}
        <form action={startBillingAction}>
          <button type="submit">Add a card</button>
        </form>
      </div>
      <div className="notice" style={{ maxWidth: 400, marginTop: 24 }}>
        <h3>Your card, kept by Stripe</h3>
        <p>We never see or store your card details ourselves — Stripe handles that part directly.</p>
      </div>
    </main>
  );
}

export default function BillingStart() {
  return (
    <Suspense fallback={<main className="shell" />}>
      <StartBillingBody />
    </Suspense>
  );
}
