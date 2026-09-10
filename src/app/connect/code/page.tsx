import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';
import { listLinks } from '@/lib/circle';
import { recallCode } from '@/lib/last-code';
import { endLinkAction } from '../actions';

export default async function CodePage() {
  const caregiver = await currentCaregiver();
  if (!caregiver) redirect('/sign-in');

  const remembered = await recallCode();
  const links = await listLinks();
  const link = remembered ? links.find((l) => l.linkId === remembered.linkId) : undefined;

  if (!link) redirect('/connect');

  const her = link.seniorName;
  const firstName = caregiver.name ? caregiver.name.split(' ')[0] : 'Someone';

  if (link.status === 'declined') {
    return (
      <main className="shell">
        <Link href="/dashboard" className="wordmark">
          Lisa <span>&amp; Me</span>
        </Link>
        <div className="card">
          <span className="status off">She said no</span>
          <h1 style={{ marginTop: 18 }}>{her} decided not to connect you</h1>
          <p>
            That is her decision to make, and Lisa will not press her on it. She is still using the
            app exactly as before — nothing about her day has changed.
          </p>
          <p className="muted">
            If you think it was a misunderstanding, the best thing is to talk to her, not to send
            another code.
          </p>
        </div>
        <p className="footnote">
          <Link href="/dashboard">Back to your dashboard</Link>
        </p>
      </main>
    );
  }

  if (link.status === 'connected') redirect('/dashboard');

  const waitingOnHer = link.status === 'proposed';

  return (
    <main className="shell">
      <Link href="/dashboard" className="wordmark">
        Lisa <span>&amp; Me</span>
      </Link>

      <div className="card">
        <span className="status pending">
          {waitingOnHer ? `Lisa is asking ${her}` : `Waiting for ${her}`}
        </span>

        {waitingOnHer ? (
          <>
            <h1 style={{ marginTop: 18 }}>{her} has entered the code</h1>
            <p>
              Lisa is asking her about it now. Nothing is connected until she says yes, and you will
              see the answer here either way.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ marginTop: 18 }}>Give {her} this code</h1>
            <div className="pairing-code">{remembered!.code}</div>
            <p>
              Read it to her over the phone, or write it down for her. She types it into her Lisa app
              once, and never again.
            </p>
            <p>
              Lisa will ask {her} out loud before anything happens, and she can say no. You will see
              either way.
            </p>

            <details className="aside">
              <summary>What Lisa says to her</summary>
              <p>
                Lisa names you — &ldquo;{firstName} would like to keep an eye on how you are
                doing&rdquo; — and tells her what you would be able to see, and what you would not.
                If she agrees, Lisa mentions it again the next day, so it cannot be something she
                said yes to once and forgot.
              </p>
            </details>

            <div className="notice">
              <h3>Until {her} says yes, you are not in her circle</h3>
              <p>
                Your account is real and your subscription is active — but Lisa will not call you,
                message you, or tell you anything about {her} until she has agreed out loud. That is
                enforced where the calls are made, not just hidden on this page, so nobody with a
                portal login can go around it.
              </p>
            </div>

            <p className="muted">
              The code works for seven days. If it is not used by then it stops working on its own.
            </p>
          </>
        )}
      </div>

      <form action={endLinkAction} style={{ marginTop: 18 }}>
        <input type="hidden" name="linkId" value={link.linkId} />
        <button type="submit" className="secondary">
          Cancel this invitation
        </button>
      </form>
    </main>
  );
}
