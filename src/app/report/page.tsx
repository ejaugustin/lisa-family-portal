'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { REASONS, submitReportAction, type ReportState } from './actions';

const initial: ReportState = {};

export default function ReportChange() {
  const [state, action, pending] = useActionState(submitReportAction, initial);

  return (
    <main className="shell">
      <Link href="/dashboard" className="wordmark">
        Lisa <span>&amp; Me</span>
      </Link>

      <div className="card">
        <h1>Something&rsquo;s changed</h1>
        <p>Tell us what has happened and we will take it from here.</p>

        <form action={action}>
          <fieldset className="choices">
            <legend>What has changed?</legend>
            {REASONS.map((r) => (
              <label key={r.id} className="choice">
                <input type="radio" name="reason" value={r.id} />
                <span>{r.label}</span>
              </label>
            ))}
          </fieldset>

          <label htmlFor="detail">Anything you would like to add</label>
          <textarea id="detail" name="detail" rows={4} placeholder="Optional" />

          <div className="notice">
            <h3>What happens when you send this</h3>
            <p>
              Lisa stops calling and stops her reminders straight away — it would be worse to keep
              ringing. Someone here reads your report and confirms it with you before anything becomes
              permanent. Nothing is deleted: her messages, photos and history stay until you or her
              estate ask us to remove them.
            </p>
            <p style={{ marginTop: 12 }}>
              If you&rsquo;ve sent this by mistake, tell us and we&rsquo;ll turn everything back on.
              That&rsquo;s what the review is for.
            </p>
          </div>

          <button type="submit" disabled={pending}>
            {pending ? 'Sending…' : 'Send this to us'}
          </button>
        </form>

        {state.error && <div className="error">{state.error}</div>}
      </div>

      <p className="footnote">
        <Link href="/settings">← Back to settings</Link>
      </p>
    </main>
  );
}
