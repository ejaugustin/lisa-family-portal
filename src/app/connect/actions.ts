'use server';

import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';
import { createLink, readableCircleError, revokeLink } from '@/lib/circle';
import { forgetCode, rememberCode } from '@/lib/last-code';

export type ConnectState = { error?: string };

export async function startLinkAction(_prev: ConnectState, form: FormData): Promise<ConnectState> {
  if (!(await currentCaregiver())) redirect('/sign-in');

  const seniorName = String(form.get('seniorName') ?? '').trim();
  if (!seniorName) return { error: 'Please tell us her name — just what you call her is fine.' };

  // Everything except the name is optional and stays optional. A daughter
  // describing her mother to a system before her mother has agreed to any of
  // it is the dynamic the consent rules exist to prevent, so these travel as
  // hints for Lisa's first conversation, not as a record about a person.
  let issued;
  try {
    issued = await createLink({
      seniorName,
      approxAge: String(form.get('approxAge') ?? '').trim() || undefined,
      livesAlone: String(form.get('livesAlone') ?? '').trim() || undefined,
    });
  } catch (err) {
    return { error: readableCircleError(err) };
  }

  await rememberCode({ linkId: issued.linkId, code: issued.code });
  redirect('/connect/code');
}

export async function endLinkAction(form: FormData): Promise<void> {
  if (!(await currentCaregiver())) redirect('/sign-in');
  const linkId = String(form.get('linkId') ?? '');
  if (linkId) {
    await revokeLink(linkId);
    await forgetCode();
  }
  redirect('/dashboard');
}
