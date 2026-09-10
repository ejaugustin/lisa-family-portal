import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';
import { listLinks, listAlerts, type EscalationEvent } from '@/lib/circle';
import { PortalNav } from '../_components/PortalNav';

// LISA-SAFETY-001. Wired to lisa-escalation-engine's EscalationEventsTable
// as of 2026-09-06 — the silence trigger only; missed-medication/meal
// triggers aren't built yet (see the roadmap doc's P0 section), so an
// otherwise-quiet household with real medication gaps won't show anything
// here. Shown honestly: no fabricated event history, only what the engine
// has actually detected.

const TIER_COPY: Record<EscalationEvent['tier'], { label: string; note: string }> = {
  1: { label: "Hasn't talked to Lisa in a day", note: 'Nothing sent to you yet — Lisa checks in warmer on her own first.' },
  2: { label: "Hasn't talked to Lisa in two days", note: 'Still just between her and Lisa for now.' },
  3: { label: "Hasn't talked to Lisa in a few days", note: "You're being told because this has gone on a while." },
  4: { label: 'Extended silence', note: 'This is past what we consider routine.' },
  5: { label: 'Extended silence — highest level', note: 'This is the most serious level Lisa tracks.' },
};

function EventCard({ event }: { event: EscalationEvent }) {
  const copy = TIER_COPY[event.tier];
  const opened = new Date(event.openedAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return (
    <div className="card event-card">
      <div className="event-head">
        <div>
          <h3 style={{ margin: '0 0 4px' }}>{copy.label}</h3>
          <p className="muted" style={{ margin: 0 }}>{copy.note}</p>
        </div>
        <span className="event-outcome">{event.status === 'open' ? 'Ongoing' : 'Resolved'}</span>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        Started {opened}
        {event.resolvedAt &&
          ` · resolved ${new Date(event.resolvedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
      </p>
      {event.outcome && (
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>{event.outcome}</p>
      )}
    </div>
  );
}

export default async function AlertHistory() {
  const caregiver = await currentCaregiver();
  if (!caregiver) redirect('/sign-in');

  const links = await listLinks();
  const connected = links.find((l) => l.status === 'connected');
  const events = connected ? await listAlerts(connected.linkId) : [];

  return (
    <>
      <PortalNav active="history" caregiverName={caregiver.name || caregiver.email} />

      <main className="portal-main" style={{ maxWidth: 880 }}>
        <div>
          <h1>Alert history</h1>
          <p className="muted">
            Every time Lisa reaches out to you, and why, lives here. Right now this only covers her
            noticing that you two haven&rsquo;t talked in a while &mdash; medication and meal check-ins
            are still being built.
          </p>
        </div>

        {!connected && (
          <div className="card">
            <h2>Not connected yet</h2>
            <p className="muted">
              You&rsquo;ll see anything Lisa notices here once someone has confirmed the connection from
              their own phone.
            </p>
          </div>
        )}

        {connected && events.length === 0 && (
          <div className="card">
            <h2>Nothing to show</h2>
            <p className="muted">
              Lisa hasn&rsquo;t noticed anything worth telling you about &mdash; that&rsquo;s a good
              sign, not a sign this isn&rsquo;t working yet.
            </p>
          </div>
        )}

        {connected && events.map((event) => <EventCard key={event.eventId} event={event} />)}
      </main>
    </>
  );
}
