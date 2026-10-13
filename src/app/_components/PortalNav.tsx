import Link from 'next/link';
import { signOutAction } from '../actions';

// Account preferences and alert consent remain reachable through the caregiver
// name without placing Settings in the viewing navigation.

const ITEMS: { key: string; label: string; href: string }[] = [
  { key: 'today', label: 'Today', href: '/dashboard' },
  { key: 'ask', label: 'Ask Lisa', href: '/ask-lisa' },
  { key: 'topic-hints', label: 'Flag a topic', href: '/topic-hints' },
  { key: 'history', label: 'Alert history', href: '/alerts' },
  { key: 'look-in', label: 'Look-In', href: '/look-in' },
  { key: 'visit-notes', label: 'Visit notes', href: '/visit-notes' },
  { key: 'circle', label: 'Care circle', href: '/care-circle' },
];

export function PortalNav({
  active,
  caregiverName,
}: {
  active: 'today' | 'ask' | 'topic-hints' | 'history' | 'vision' | 'look-in' | 'check-in' | 'happenings' | 'visit-notes' | 'circle' | 'settings' | 'report';
  caregiverName?: string;
}) {
  const highlighted = active === 'report' ? 'settings' : active === 'check-in' || active === 'happenings' ? 'look-in' : active;

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
              aria-current={item.key === highlighted ? 'page' : undefined}
              className={`portal-nav-link${item.key === highlighted ? ' active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form action={signOutAction} className="portal-header-sign-out">
          {caregiverName && <Link href="/settings" className="portal-header-name" title="Your account and alert consent">{caregiverName}</Link>}
          <button type="submit" className="secondary">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
