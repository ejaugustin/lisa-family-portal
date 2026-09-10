'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { reportLostPhoneAction, type LostPhoneState } from './actions';

const initial: LostPhoneState = {};

// LISA-ID-002, Layer 3 — reached from the dashboard's connected card. This
// is a deliberately weighty confirmation, not a casual click: submitting it
// immediately stops every phone on her household from working, including
// hers, if it turns out not to actually be lost.
export default function LostPhone({ searchParams }: { searchParams: { linkId?: string; her?: string } }) {
  const [state, action, pending] = useActionState(reportLostPhoneAction, initial);
  const her = searchParams.her ?? 'She';
  const linkId = searchParams.linkId ?? '';

  return (
    <main className="shell">
      <Link href="/dashboard" className="wordmark">
        Lisa <span>&amp; Me</span>
      </Link>

      <div className="card">
        <h1>{her}&rsquo;s phone was lost</h1>
        <p>
          Use this when her phone is gone and she needs Lisa & Me on a different one — hers if it
          turns up on a new device, or one you lend her in the meantime.
        </p>

        <div className="notice">
          <h3>What happens the moment you confirm</h3>
          <p>
            The lost phone stops working right away — it will not be able to talk to Lisa again,
            even if someone finds it. Nothing on it is deleted; it simply can no longer reach her
            account. You&rsquo;ll get a code, good for one hour, to read to her once Lisa & Me is
            installed again. Everything she has told Lisa is still there waiting for her.
          </p>
        </div>

        <p className="muted">
          If there is any chance the phone is just misplaced and might turn up today, it may be worth
          waiting — this cannot be undone from here once you confirm it.
        </p>

        {state.error ? <p className="error">{state.error}</p> : null}

        <form action={action} style={{ marginTop: 18 }}>
          <input type="hidden" name="linkId" value={linkId} />
          <button type="submit" disabled={pending || !linkId}>
            {pending ? 'One moment…' : `Yes, ${her}'s phone was lost`}
          </button>
        </form>
      </div>

      <p className="footnote">
        <Link href="/dashboard">Back to your dashboard</Link>
      </p>
    </main>
  );
}
