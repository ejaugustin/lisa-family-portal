import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';
import { listLinks, listInquiries } from '@/lib/circle';
import { PortalNav } from '../_components/PortalNav';
import { AskLisaThread } from './AskLisaThread';

// Addendum A. Wired to lisa-caregiver-inquiry-handler /
// CaregiverInquiriesTable as of 2026-09-06 — every question gets a real,
// honest answer from a fixed tier policy (never an LLM guess about how she
// actually is), and every question — answered or declined — gets disclosed
// to her on Lisa's next turn with her. See lisa-caregiver-portal.md.

const TIERS: { label: string; note: string; tone: 'confirm' | 'amber' | 'never' }[] = [
  { label: 'How she seems', note: 'Mood, engagement, whether you should worry. Always available.', tone: 'confirm' },
  { label: 'Anything already flagged', note: 'If Lisa has alerted you about it, she can talk about it.', tone: 'confirm' },
  {
    label: 'Medication and conditions',
    note: 'Only if she has chosen to share it. Whether she has is on your Settings page.',
    tone: 'amber',
  },
  { label: 'What she actually said', note: 'Never — not a transcript, not a summary of one. No exceptions.', tone: 'never' },
];

const TONE_COLOR: Record<(typeof TIERS)[number]['tone'], string> = {
  confirm: 'var(--confirm-dark)',
  amber: 'var(--amber-text)',
  never: '#7A2E22',
};

export default async function AskLisa() {
  const caregiver = await currentCaregiver();
  if (!caregiver) redirect('/sign-in');

  const links = await listLinks();
  const connected = links.find((l) => l.status === 'connected');
  const inquiries = connected ? await listInquiries(connected.linkId) : [];

  return (
    <>
      <PortalNav active="ask" caregiverName={caregiver.name || caregiver.email} />

      <main className="portal-main">
        <div>
          <h1>Ask Lisa</h1>
          <p className="muted">She&rsquo;ll mention to her that you asked.</p>
        </div>

        <div className="ask-layout">
          <div className="ask-thread">
            {connected ? (
              <AskLisaThread
                linkId={connected.linkId}
                seniorName={connected.seniorName}
                initialInquiries={inquiries}
              />
            ) : (
              <div className="card">
                <h2>Not connected yet</h2>
                <p className="muted">
                  You&rsquo;ll be able to ask Lisa about someone once they&rsquo;ve confirmed the
                  connection from their own phone. The policy on the right is real and already
                  decided — there&rsquo;s just no one to ask about yet.
                </p>
              </div>
            )}
          </div>

          <div className="ask-rail">
            <div className="notice">
              <h3>Your mother is told you asked</h3>
              <p>
                Lisa mentions it in their next conversation, warmly and in passing — &ldquo;Sarah checked in
                on you today.&rdquo; That happens whether she answers you or not. This isn&rsquo;t a back
                channel, and it isn&rsquo;t meant to be one.
              </p>
            </div>

            <div className="card">
              <h3 style={{ textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.07em', color: 'var(--ink-3)' }}>
                What Lisa will and won&rsquo;t say
              </h3>
              {TIERS.map((t) => (
                <div key={t.label} className="tier-row">
                  <span className="tier-label" style={{ color: TONE_COLOR[t.tone] }}>
                    {t.label}
                  </span>
                  <span className="tier-note">{t.note}</span>
                </div>
              ))}
              <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
                Asking a different way won&rsquo;t change the answer.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
