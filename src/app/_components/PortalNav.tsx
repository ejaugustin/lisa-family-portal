import Link from 'next/link';
import { signOutAction } from '../actions';

// Shared top nav for every signed-in view, per the handoff's "views via top
// nav" behaviour rule. `active` picks the highlighted item the same way the
// design's prototype does — Settings stays highlighted while on the Report
// sub-view, since that page is reached from Settings and has its own back
// link rather than living in the nav.

const ITEMS: { key: string; label: string; href: string }[] = [
  { key: 'today', label: 'Today', href: '/dashboard' },
  { key: 'ask', label: 'Ask Lisa', href: '/ask-lisa' },
  { key: 'topic-hints', label: 'Flag a topic', href: '/topic-hints' },
  { key: 'history', label: 'Alert history', href: '/alerts' },
  { key: 'visit-notes', label: 'Visit notes', href: '/visit-notes' },
  { key: 'circle', label: 'Care circle', href: '/care-circle' },
  { key: 'settings', label: 'Settings', href: '/settings' },
];

export function PortalNav({
  active,
  caregiverName,
}: {
  active: 'today' | 'ask' | 'topic-hints' | 'history' | 'visit-notes' | 'circle' | 'settings' | 'report';
  caregiverName?: string;
}) {
  const highlighted = active === 'report' ? 'settings' : active;

  return (
    <header className="portal-header">
      <div className="portal-header-row">
        <Link href="/dashboard" className="wordmark" style={{ margin: 0 }}>
          Lisa <span>&amp; Me</span>
        </Link>

        <nav className="portal-nav" aria-label="Portal">
          {ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`portal-nav-link${item.key === highlighted ? ' active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form action={signOutAction} className="portal-header-sign-out">
          {caregiverName && <span className="portal-header-name">{caregiverName}</span>}
          <button type="submit" className="secondary">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
