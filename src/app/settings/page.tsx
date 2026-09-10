import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';
import { PortalNav } from '../_components/PortalNav';
import { startBillingAction } from '../billing/actions';

// alertSensitivity, phone verification and the senior's visibility flags all
// come from data this portal can't reach yet (no field on Caregiver, no
// endpoint in circle.ts) — shown here as real, decided policy rather than
// interactive controls that would silently do nothing. What IS real: the
// account itself (email, password reset) and the report-a-change entry
// point, both already wired.

const SENSITIVITY = [
  { label: 'Tell me about anything unusual', note: 'Every flag, including the ones that turn out to be nothing.' },
  {
    label: 'Tell me when it looks like it matters',
    note: 'A pattern over a day or two, or anything urgent. Most families choose this.',
    selected: true,
  },
  { label: 'Only when it’s serious', note: 'Emergencies and clear escalations. Quiet otherwise.' },
];

export default async function Settings() {
  const caregiver = await currentCaregiver();
  if (!caregiver) redirect('/sign-in');

  return (
    <>
      <PortalNav active="settings" caregiverName={caregiver.name || caregiver.email} />

      <main className="portal-main" style={{ maxWidth: 880 }}>
        <div>
          <h1>Your settings</h1>
          <p className="muted">How much Lisa tells you, and how soon.</p>
        </div>

        <div className="card">
          <h2>When Lisa contacts you</h2>
          <p className="muted">Applies to you only. Everyone in a circle sets their own.</p>
          {SENSITIVITY.map((s) => (
            <div key={s.label} className={`setting-row${s.selected ? ' selected' : ''}`} style={{ marginBottom: 10 }}>
              <div className="setting-dot" />
              <div>
                <div className="setting-label">{s.label}</div>
                <div className="setting-note">{s.note}</div>
              </div>
            </div>
          ))}
          <p className="muted" style={{ marginBottom: 0 }}>
            There&rsquo;s a floor you can&rsquo;t go below — however quiet you set this, a genuine
            emergency still reaches you. Choosing between these is still being built; for now every
            caregiver gets the middle option.
          </p>
        </div>

        <div className="card">
          <h2>Your account</h2>
          <div className="share-row">
            <span style={{ fontSize: 16 }}>Email</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{caregiver.email}</span>
          </div>
          <div className="share-row">
            <span style={{ fontSize: 16 }}>Password</span>
            <Link href="/forgot-password">Reset it</Link>
          </div>
          <div className="share-row">
            <span style={{ fontSize: 16 }}>Payment method</span>
            <form action={startBillingAction} style={{ margin: 0 }}>
              <button
                type="submit"
                style={{
                  width: 'auto',
                  margin: 0,
                  padding: 0,
                  background: 'none',
                  border: 'none',
                  color: 'var(--link)',
                  fontSize: 15,
                  fontWeight: 400,
                  cursor: 'pointer',
                }}
              >
                Update card
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <h2>What she&rsquo;s chosen to share with you</h2>
          <p className="muted">Hers to decide, not yours to change. It&rsquo;s here so you know where the edges are.</p>
          <p className="muted" style={{ marginBottom: 0 }}>
            Showing her actual choices here is still being built. Until then, assume the defaults: how
            she seems day to day, yes; her medication and conditions, only if she&rsquo;s said so
            herself.
          </p>
        </div>

        <div className="card row-between">
          <div>
            <h2 style={{ marginBottom: 4 }}>Something&rsquo;s changed</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              She&rsquo;s moved into care, the family&rsquo;s stopping the service, or she&rsquo;s passed
              away.
            </p>
          </div>
          <Link href="/report" className="action-btn">
            Tell us
          </Link>
        </div>
      </main>
    </>
  );
}
