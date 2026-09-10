import type { Metadata } from 'next';
import { missingEnv } from '@/lib/env';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lisa & Me — for family',
  description: 'How your person is getting on, and a way to ask Lisa about them.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const missing = missingEnv();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{missing.length > 0 ? <SetupNeeded missing={missing} /> : children}</body>
    </html>
  );
}

/**
 * Shown instead of the app when configuration is missing. A developer should
 * find out on the first page load and be told exactly which values are absent —
 * not after filling in a signup form and hitting a stack trace.
 */
function SetupNeeded({ missing }: { missing: string[] }) {
  return (
    <main className="shell">
      <span className="wordmark">
        Lisa <span>&amp; Me</span>
      </span>
      <div className="card">
        <h1>Almost set up</h1>
        <p>
          The portal needs a few values in <code>.env.local</code> before it can talk to Cognito. These
          are still missing or unchanged from the example file:
        </p>
        <ul>
          {missing.map((name) => (
            <li key={name}>
              <code>{name}</code>
            </li>
          ))}
        </ul>
        <p className="muted">
          The pool and client ids are printed by <code>npx cdk deploy</code> in <code>backend/</code>.
          The client secret is not — read it from the Cognito console, or with{' '}
          <code>aws cognito-idp describe-user-pool-client</code>.
        </p>
        <p className="muted">Restart <code>npm run dev</code> after editing the file — Next.js reads it at startup.</p>
      </div>
    </main>
  );
}
