import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';
import { recallRecoveryCode } from '@/lib/last-code';

export default async function LostPhoneCode() {
  const caregiver = await currentCaregiver();
  if (!caregiver) redirect('/sign-in');

  const remembered = await recallRecoveryCode();
  if (!remembered) redirect('/dashboard');

  const expiresIn = Math.max(0, Math.round((remembered.expiresAt * 1000 - Date.now()) / 60000));

  return (
    <main className="shell">
      <Link href="/dashboard" className="wordmark">
        Lisa <span>&amp; Me</span>
      </Link>

      <div className="card">
        <span className="status pending">
          {remembered.devicesRevoked > 0 ? 'The old phone has been disconnected' : 'Ready when she is'}
        </span>
        <h1 style={{ marginTop: 18 }}>Read her this code</h1>
        <div className="pairing-code">{remembered.code}</div>
        <p>
          Once Lisa & Me is installed and open, she&rsquo;ll be asked if she&rsquo;s talked with Lisa
          before. She says yes, then types this in — everything she&rsquo;s told Lisa is still there
          waiting for her.
        </p>
        <p className="muted">
          This code works for about {expiresIn > 0 ? `${expiresIn} more minutes` : 'a little while longer'}
          . If it expires before she uses it, come back here and start again.
        </p>
      </div>

      <p className="footnote">
        <Link href="/dashboard">Back to your dashboard</Link>
      </p>
    </main>
  );
}
