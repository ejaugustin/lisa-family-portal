'use server';

import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';
import type { ReportState } from './reasons';

export async function submitReportAction(_prev: ReportState, form: FormData): Promise<ReportState> {
  if (!(await currentCaregiver())) redirect('/sign-in');

  const reason = String(form.get('reason') ?? '');
  if (!reason) return { error: 'Please choose one so we know what has happened.' };

  // PROTOTYPE: the real thing writes OffboardingRequests and invokes
  // lisa-offboarding-handler, which pauses outreach immediately. `status`
  // never auto-transitions to confirmed — a human sets reviewedBy/reviewedAt.
  redirect(`/report/sent?reason=${encodeURIComponent(reason)}`);
}
