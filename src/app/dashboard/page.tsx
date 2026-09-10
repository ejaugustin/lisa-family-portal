import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';
import { listLinks } from '@/lib/circle';
import { endLinkAction } from '../connect/actions';
import { PortalNav } from '../_components/PortalNav';

// The signed-in home. It answers only questions we can honestly answer. A
// dashboard full of placeholder tiles would teach a worried family member to
// distrust everything else on the page.

export default async function Dashboard() {
  const caregiver = await currentCaregiver();
  if (!caregiver) redirect('/sign-in');

  const links = await listLinks();
  const connected = links.find((l) => l.status === 'connected');
  const pending = links.find((l) => l.status === 'awaiting' || l.status === 'proposed');
  const declined = links.find((l) => l.status === 'declined');

  return (
    <>
      <PortalNav active="today" caregiverName={caregiver.name || caregiver.email} />

      <main className="portal-main">
        <h1>Hello{caregiver.name ? `, ${caregiver.name.split(' ')[0]}` : ''}</h1>

        {connected && (
          <>
            <div className="card">
              <span className="status on">Connected</span>
              <h2 style={{ marginTop: 18 }}>{connected.seniorName} said yes</h2>
              <p>
                She connected you from her own phone
                {connected.connectedAt
                  ? ` on ${new Date(connected.connectedAt).toLocaleDateString()}`
                  : ''}
                . She can see that you are connected, and she can undo it at any time without asking
                you.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <form action={endLinkAction}>
                  <input type="hidden" name="linkId" value={connected.linkId} />
                  <button type="submit" className="secondary" style={{ maxWidth: 220 }}>
                    End this connection
                  </button>
                </form>
                <Link
                  href={`/lost-phone?linkId=${encodeURIComponent(connected.linkId)}&her=${encodeURIComponent(connected.seniorName)}`}
                >
                  <button type="button" className="secondary" style={{ maxWidth: 220 }}>
                    Her phone was lost
                  </button>
                </Link>
              </div>
            </div>

            <div className="card">
              <h2>How she is doing</h2>
              <p className="muted">
                This is where her days will be summarised — how she has been in herself, whether she
                has been eating and sleeping, whether anything sounded worth a call. Not transcripts:
                Lisa will tell you how your mother is, not what she said.
              </p>
              <p className="muted">Being built next.</p>
            </div>
          </>
        )}

        {!connected && pending && (
          <div className="card">
            <span className="status pending">
              {pending.status === 'proposed'
                ? `Lisa is asking ${pending.seniorName}`
                : `Waiting for ${pending.seniorName}`}
            </span>
            <h2 style={{ marginTop: 18 }}>
              {pending.status === 'proposed'
                ? `${pending.seniorName} has entered the code`
                : `${pending.seniorName} has not used the code yet`}
            </h2>
            <p>
              {pending.status === 'proposed'
                ? 'Lisa is asking her about it now. You will see her answer here.'
                : 'Nothing happens until she enters it on her own phone and says yes out loud.'}
            </p>
            <Link href="/connect/code">See the invitation</Link>
          </div>
        )}

        {!connected && !pending && declined && (
          <div className="card">
            <span className="status off">She said no</span>
            <h2 style={{ marginTop: 18 }}>
              {declined.seniorName} decided not to connect you
            </h2>
            <p>
              That is hers to decide. She is still using the app exactly as before. The best next
              step is a conversation, not another code.
            </p>
            <Link href="/connect">Start again when she is ready</Link>
          </div>
        )}

        {!connected && !pending && !declined && (
          <div className="card">
            <span className="status off">Not connected yet</span>
            <h2 style={{ marginTop: 18 }}>You are not linked to anyone yet</h2>
            <p>
              To see how someone is getting on, they need to connect you from their own phone. Lisa
              will ask them out loud first, and tell them exactly what you would be able to see — that
              is deliberate, and it is not something we will do behind their back.
            </p>
            <Link href="/connect">
              <button type="button" style={{ maxWidth: 260 }}>
                Set this up for someone
              </button>
            </Link>
          </div>
        )}

        <p className="footnote">
          Signed in as {caregiver.email} &nbsp;·&nbsp; <Link href="/report">Something&rsquo;s changed</Link>
        </p>
      </main>
    </>
  );
}
