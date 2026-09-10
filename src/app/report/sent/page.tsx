import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';
import { REASONS } from '../reasons';

export default async function ReportSent({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  if (!(await currentCaregiver())) redirect('/sign-in');

  const { reason } = await searchParams;
  const chosen = REASONS.find((r) => r.id === reason);

  return (
    <main className="shell">
      <Link href="/dashboard" className="wordmark">
        Lisa <span>&amp; Me</span>
      </Link>

      <div className="card">
        <span className="status pending">Received</span>
        <h1 style={{ marginTop: 18 }}>Thank you for telling us</h1>
        <p>
          {chosen ? <>You told us: <strong>{chosen.label.toLowerCase()}</strong>. </> : null}
          Lisa has already stopped calling and stopped her reminders.
        </p>
        <p>
          Someone here will read this and come back to you before anything becomes permanent. If you
          need to reach us before then, reply to the email we have just sent you.
        </p>
        <p className="muted">
          Nothing has been deleted, and nothing will be without you or her estate asking.
        </p>
      </div>

      <p className="footnote">
        <Link href="/dashboard">Back to your dashboard</Link>
      </p>
    </main>
  );
}
