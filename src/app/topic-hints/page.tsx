import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';
import { listLinks, listTopicHints } from '@/lib/circle';
import { PortalNav } from '../_components/PortalNav';
import { TopicHintComposer } from './TopicHintComposer';

// LISA-CIRCLE-002 (P4/P9). The backend API (createTopicHint,
// caregiverApi's /topic-hints route) has existed since P4 — this page is
// the composer for it, the missing half. See shared/topicHints.ts's header
// comment for the line this feature must never cross: a topic, never a
// message. The copy on this page exists to hold that line for a caregiver
// who has never read that file, not just to describe the feature.

export default async function TopicHints() {
  const caregiver = await currentCaregiver();
  if (!caregiver) redirect('/sign-in');

  const links = await listLinks();
  const connected = links.find((l) => l.status === 'connected');
  const hints = connected ? await listTopicHints(connected.linkId) : [];

  return (
    <>
      <PortalNav active="topic-hints" caregiverName={caregiver.name || caregiver.email} />

      <main className="portal-main">
        <div>
          <h1>Flag a topic</h1>
          <p className="muted">Not a message Lisa delivers — a subject she may bring up in her own way.</p>
        </div>

        <div className="ask-layout">
          <div className="ask-thread">
            {connected ? (
              <TopicHintComposer
                linkId={connected.linkId}
                seniorName={connected.seniorName}
                initialHints={hints}
              />
            ) : (
              <div className="card">
                <h2>Not connected yet</h2>
                <p className="muted">
                  You&rsquo;ll be able to flag something for Lisa once they&rsquo;ve confirmed the
                  connection from their own phone.
                </p>
              </div>
            )}
          </div>

          <div className="ask-rail">
            <div className="notice">
              <h3>This isn&rsquo;t a message</h3>
              <p>
                Type a subject, not something you want said &mdash; &ldquo;her surgery is
                Thursday,&rdquo; not &ldquo;tell her good luck for me.&rdquo; Lisa decides if, when, and
                how to bring it up, warmly and in her own words, at a natural moment. She won&rsquo;t
                always mention it right away, and she won&rsquo;t relay it verbatim.
              </p>
            </div>

            <div className="card">
              <h3 style={{ textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.07em', color: 'var(--ink-3)' }}>
                What she&rsquo;s told
              </h3>
              <p className="muted" style={{ margin: 0 }}>
                Unlike Ask Lisa, this is never attributed to you by name. Lisa brings up the subject
                itself &mdash; she never says a caregiver asked her to.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
