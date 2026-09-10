'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { startLinkAction, type ConnectState } from './actions';

const initial: ConnectState = {};

export default function Connect() {
  const [state, action, pending] = useActionState(startLinkAction, initial);

  return (
    <main className="shell">
      <Link href="/dashboard" className="wordmark">
        Lisa <span>&amp; Me</span>
      </Link>

      <div className="card">
        <h1>Who are you setting this up for?</h1>
        <p>
          Only her name is needed. Lisa will learn the rest from her, in her own words — that is
          rather the point.
        </p>

        <form action={action}>
          <label htmlFor="seniorName">Her name</label>
          <input id="seniorName" name="seniorName" autoComplete="off" placeholder="Mum, Doris, Nana…" />
          <p className="muted" style={{ marginTop: 6 }}>
            Whatever you actually call her. Lisa will ask her what she would like to be called.
          </p>

          <div className="optional">
            <p className="optional-head">
              If it helps Lisa start warmer — all optional, and Mum can correct any of it
            </p>

            <label htmlFor="approxAge">Roughly how old is she?</label>
            <input id="approxAge" name="approxAge" autoComplete="off" placeholder="Early eighties" />

            <label htmlFor="livesAlone">Does she live on her own?</label>
            <input id="livesAlone" name="livesAlone" autoComplete="off" placeholder="Yes, since Dad died" />

            <p className="muted" style={{ marginTop: 12 }}>
              Lisa treats these as something you mentioned, not as facts about her. She will check
              anything that matters with your mother herself.
            </p>
          </div>

          <button type="submit" disabled={pending}>
            {pending ? 'One moment…' : 'Get her code'}
          </button>
        </form>

        {state.error && <div className="error">{state.error}</div>}
      </div>

      <p className="footnote">Nothing reaches your mother until she says yes on her own phone.</p>
    </main>
  );
}
