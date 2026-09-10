'use server';

import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';
import { askLisa as askLisaApi, readableCircleError, type CaregiverInquiry } from '@/lib/circle';

export type AskState = { error?: string; inquiry?: CaregiverInquiry; askedAt?: number };

export async function askLisaAction(linkId: string, _prev: AskState, form: FormData): Promise<AskState> {
  if (!(await currentCaregiver())) redirect('/sign-in');

  const question = String(form.get('question') ?? '').trim();
  if (!question) return { error: 'Type a question first.' };
  if (question.length > 500) return { error: 'Keep it under 500 characters, please.' };

  try {
    const inquiry = await askLisaApi(linkId, question);
    // askedAt makes every submission distinct even if, in theory, the exact
    // same question were asked twice in a row — the thread needs to append a
    // new bubble each time, not dedupe on inquiryId alone (inquiryId already
    // guarantees that, this is just belt-and-braces for the effect below).
    return { inquiry, askedAt: Date.now() };
  } catch (err) {
    return { error: readableCircleError(err) };
  }
}
