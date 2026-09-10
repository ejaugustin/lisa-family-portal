import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';
import { listLinks, listVisitNotes, type VisitNote, type VisitNoteKind } from '@/lib/circle';
import { PortalNav } from '../_components/PortalNav';

// LISA-VISIT-001 (P8). Until now these lived only on her phone — see the
// app's VisitNote type for why (a symptom list is a different class of
// thing to hold than a reminder schedule). They're shown here exactly as
// she said them: her own words, never a diagnosis or a conclusion Lisa
// drew, and never anything she's already said to strike from the list.
//
// Grouping mirrors the app's own openVisitNotes/writtenVisitNotes logic
// (src/reminders/visitNotes.ts) rather than re-deriving it independently:
// still worth raising = not yet brought up, and said again or newly
// mentioned within the last 120 days; anything older or already brought
// up moves to its own quieter section instead of disappearing.
const OPEN_WINDOW_MS = 120 * 24 * 60 * 60 * 1000;

const KIND_COPY: Record<VisitNoteKind, { label: string; note: string }> = {
  symptom: { label: 'Symptom', note: 'Something physical she mentioned.' },
  question: { label: 'Question', note: "Something she'd like to ask the doctor." },
  change: { label: 'Change', note: 'Something different from usual.' },
};

function howLong(note: VisitNote, nowMs: number): string {
  const days = Math.round((nowMs - new Date(note.firstMentionedISO).getTime()) / (24 * 60 * 60 * 1000));
  if (note.mentions > 1) {
    if (days >= 14) return `mentioned ${note.mentions} times over about ${Math.round(days / 7)} weeks`;
    if (days >= 2) return `mentioned ${note.mentions} times over about ${days} days`;
    return `mentioned ${note.mentions} times`;
  }
  if (days >= 14) return `about ${Math.round(days / 7)} weeks ago`;
  if (days >= 2) return `${days} days ago`;
  return 'recently';
}

function NoteCard({ note, nowMs }: { note: VisitNote; nowMs: number }) {
  const copy = KIND_COPY[note.kind];
  return (
    <div className="card event-card">
      <div className="event-head">
        <div>
          <h3 style={{ margin: '0 0 4px' }}>&ldquo;{note.text}&rdquo;</h3>
          <p className="muted" style={{ margin: 0 }}>{copy.note}</p>
        </div>
        <span className="event-outcome">{copy.label}</span>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        {howLong(note, nowMs)}
        {note.broughtUpISO &&
          ` · brought up ${new Date(note.broughtUpISO).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
      </p>
    </div>
  );
}

export default async function VisitNotes() {
  const caregiver = await currentCaregiver();
  if (!caregiver) redirect('/sign-in');

  const links = await listLinks();
  const connected = links.find((l) => l.status === 'connected');
  const notes = connected ? await listVisitNotes(connected.linkId) : [];

  const nowMs = Date.now();
  const stillToMention = notes
    .filter((n) => !n.broughtUpISO && nowMs - new Date(n.lastMentionedISO).getTime() < OPEN_WINDOW_MS)
    .sort(
      (a, b) =>
        b.mentions - a.mentions ||
        new Date(b.lastMentionedISO).getTime() - new Date(a.lastMentionedISO).getTime(),
    );
  const alreadyCovered = notes
    .filter((n) => !stillToMention.includes(n))
    .sort((a, b) => new Date(b.lastMentionedISO).getTime() - new Date(a.lastMentionedISO).getTime());

  return (
    <>
      <PortalNav active="visit-notes" caregiverName={caregiver.name || caregiver.email} />

      <main className="portal-main" style={{ maxWidth: 880 }}>
        <div>
          <h1>Visit notes</h1>
          <p className="muted">
            Things she&rsquo;s mentioned to Lisa that are worth telling her doctor &mdash; in her own
            words, never Lisa&rsquo;s interpretation of them.
          </p>
        </div>

        {!connected && (
          <div className="card">
            <h2>Not connected yet</h2>
            <p className="muted">
              You&rsquo;ll see anything she brings up here once someone has confirmed the connection
              from their own phone.
            </p>
          </div>
        )}

        {connected && notes.length === 0 && (
          <div className="card">
            <h2>Nothing yet</h2>
            <p className="muted">
              Nothing she&rsquo;s brought up with Lisa has been worth flagging for a doctor&rsquo;s
              visit so far.
            </p>
          </div>
        )}

        {connected && stillToMention.length > 0 && (
          <div>
            <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>Still worth mentioning</h2>
            {stillToMention.map((note) => (
              <NoteCard key={note.id} note={note} nowMs={nowMs} />
            ))}
          </div>
        )}

        {connected && alreadyCovered.length > 0 && (
          <div>
            <h2 style={{ fontSize: 16, margin: '24px 0 8px' }}>Already brought up, or older</h2>
            {alreadyCovered.map((note) => (
              <NoteCard key={note.id} note={note} nowMs={nowMs} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
