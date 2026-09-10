import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';
import { listLinks } from '@/lib/circle';
import { PortalNav } from '../_components/PortalNav';

// Addendum B. The handoff's "Care circle" is a whole family's roster —
// several caregivers, calling order, an emergency-contact designation. That
// model (CaregiverCircle with multiple members per senior) doesn't exist in
// LISA-CIRCLE-001's API yet; listLinks() only returns THIS caregiver's own
// connections. So this view shows what's real — every senior you're
// connected to or waiting on, in one place, which the dashboard alone
// doesn't do (it only ever shows one) — and says plainly that seeing the
// rest of the family's circle is coming, rather than inventing other members.
//
// The one part of Addendum B that already IS real, decision 1 in the design
// notes: an added caregiver stays pending — not call- or notification-
// eligible — until the senior confirms out loud. That gate lives in
// lisa-escalation-engine, not here; nothing on this page can bypass it.

function initial(name: string): string {
  return (name.trim()[0] || '?').toUpperCase();
}

export default async function CareCircle() {
  const caregiver = await currentCaregiver();
  if (!caregiver) redirect('/sign-in');

  const links = await listLinks();

  return (
    <>
      <PortalNav active="circle" caregiverName={caregiver.name || caregiver.email} />

      <main className="portal-main" style={{ maxWidth: 880 }}>
        <div className="row-between">
          <div>
            <h1>Care circle</h1>
            <p className="muted">Who you&rsquo;re connected to, and where each one stands.</p>
          </div>
          <Link href="/connect" className="action-btn">
            Connect someone
          </Link>
        </div>

        {links.length === 0 && (
          <div className="card">
            <h2>Nobody yet</h2>
            <p className="muted">
              Once you connect someone, they&rsquo;ll show up here — including while you&rsquo;re still
              waiting on them to say yes.
            </p>
            <Link href="/connect">
              <button type="button" style={{ maxWidth: 260 }}>
                Set this up for someone
              </button>
            </Link>
          </div>
        )}

        {links.map((link) => (
          <div key={link.linkId} className="card member-card">
            <div className="member-row">
              <div className="member-avatar">{initial(link.seniorName)}</div>
              <div className="member-info">
                <span style={{ fontSize: 19, fontWeight: 700, color: 'var(--ink)' }}>{link.seniorName}</span>
                <span className="muted" style={{ fontSize: 15 }}>
                  {link.status === 'connected' && link.connectedAt
                    ? `Connected ${new Date(link.connectedAt).toLocaleDateString()}`
                    : link.status === 'connected'
                      ? 'Connected'
                      : link.status === 'declined'
                        ? 'Said no'
                        : 'Not connected yet'}
                </span>
              </div>
            </div>

            {(link.status === 'awaiting' || link.status === 'proposed') && (
              <div className="notice">
                <h3>Waiting on {link.seniorName}</h3>
                <p>
                  {link.status === 'proposed'
                    ? 'Lisa is asking her about it now. Nothing happens until she says yes out loud.'
                    : "Lisa will ask her the next time they talk. Nothing happens until she enters the code herself and says yes out loud."}
                </p>
              </div>
            )}

            {link.status === 'connected' && (
              <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                <span style={{ color: 'var(--confirm-dark)', fontWeight: 600, fontSize: 15 }}>
                  She can see that you&rsquo;re connected, and can undo it any time without asking you.
                </span>
              </div>
            )}
          </div>
        ))}

        <div className="card">
          <h3>Anyone else who helps out, your mother is asked about first</h3>
          <p className="muted" style={{ marginBottom: 0 }}>
            The full family circle — seeing other caregivers, calling order, and adding someone new
            through this page — is still being built. For now, connecting is one person at a time, from
            the senior&rsquo;s own phone, and it works the same way it always will: Lisa raises it with
            her first, and it&rsquo;s her yes that makes it real. Nobody is ever added to a circle
            without her knowing.
          </p>
        </div>
      </main>
    </>
  );
}
