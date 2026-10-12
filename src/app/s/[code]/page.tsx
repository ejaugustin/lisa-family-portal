import type { Metadata } from 'next';
import { SharedEventViewer } from './SharedEventViewer';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Shared event | Lisa & Me', referrer: 'no-referrer', robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <SharedEventViewer code={/^[A-Za-z0-9_-]{43}$/.test(code) ? code : ''} />;
}
