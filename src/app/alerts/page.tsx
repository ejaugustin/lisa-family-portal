import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';
import { listLinks, listAlerts, type EscalationEvent } from '@/lib/circle';
import { PortalNav } from '../_components/PortalNav';

// LISA-SAFETY-001. Wired to lisa-escalation-engine's EscalationEventsTable
// as of 2026-09-06 — the silence trigger. LISA-MEALS-001 (2026-09-12) added
// the meal-skip-streak trigger alongside it. Missed-MEDICATION triggers
// still aren't built (see the roadmap doc's P0 section), so an otherwise-
// quiet, well-fed household with real medication gaps won't show anything
// here. Shown honestly: no fabricated event history, only what the engine
// has actually detected.

// LISA-SAFETY-002 — the static per-tier TIER_COPY lookup table that used to
// live here is gone. It could only ever show one of five canned lines and
// had nothing to say about how long it had actually been — this card now
// shows the real sentence the backend generated for THIS event
// (shared/escalation.ts's buildReasoningText), which reflects the actual
// elapsed time and is recomputed every time the event's tier changes.

function EventCard({ event }: { event: EscalationEvent }) {
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
          <h3 style={{ margin: '0 0 4px' }}>{event.reasoningText}</h3>
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
            Every time Lisa reaches out to you, and why, lives here. This covers her noticing that
            you two haven&rsquo;t talked in a while, and a pattern of skipped meals &mdash; medication
            check-ins are still being built.
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
