'use server';

import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';
import { issueLostPhoneCode, readableCircleError, CircleError } from '@/lib/circle';
import { rememberRecoveryCode } from '@/lib/last-code';

export type LostPhoneState = { error?: string };

// LISA-ID-002, Layer 3 — "Her phone was lost." One action does both halves:
// the backend revokes every device on her household the instant this runs
// (see lambda/caregiverApi's lostPhoneCode handler), and hands back a code
// this caregiver reads to her once Lisa & Me is installed again.
export async function reportLostPhoneAction(_prev: LostPhoneState, form: FormData): Promise<LostPhoneState> {
  if (!(await currentCaregiver())) redirect('/sign-in');

  const linkId = String(form.get('linkId') ?? '');
  if (!linkId) return { error: 'Something went wrong at our end. Please go back and try again.' };

  try {
    const result = await issueLostPhoneCode(linkId);
    await rememberRecoveryCode({ linkId, ...result });
  } catch (err) {
    return { error: err instanceof CircleError ? readableCircleError(err) : 'Something went wrong at our end. Nothing has changed.' };
  }

  redirect('/lost-phone/code');
}
