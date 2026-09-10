'use server';

import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';

export type ReportState = { error?: string };

export const REASONS = [
  { id: 'moved-into-care', label: 'She has moved into care' },
  { id: 'family-wishes-stop', label: 'The family would like to stop' },
  { id: 'deceased', label: 'She has passed away' },
  { id: 'something-else', label: 'Something else' },
] as const;

export async function submitReportAction(_prev: ReportState, form: FormData): Promise<ReportState> {
  if (!(await currentCaregiver())) redirect('/sign-in');

  const reason = String(form.get('reason') ?? '');
  if (!reason) return { error: 'Please choose one so we know what has happened.' };

  // PROTOTYPE: the real thing writes OffboardingRequests and invokes
  // lisa-offboarding-handler, which pauses outreach immediately. `status`
  // never auto-transitions to confirmed — a human sets reviewedBy/reviewedAt.
  redirect(`/report/sent?reason=${encodeURIComponent(reason)}`);
}
