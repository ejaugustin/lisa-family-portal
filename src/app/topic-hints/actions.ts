'use server';

import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';
import { addTopicHint, readableCircleError, type TopicHint } from '@/lib/circle';

export type TopicHintState = { error?: string; hint?: TopicHint; addedAt?: number };

export async function addTopicHintAction(
  linkId: string,
  _prev: TopicHintState,
  form: FormData,
): Promise<TopicHintState> {
  if (!(await currentCaregiver())) redirect('/sign-in');

  const topic = String(form.get('topic') ?? '').trim();
  if (!topic) return { error: 'Type a topic first.' };
  if (topic.length > 200) return { error: 'Keep it under 200 characters, please.' };

  try {
    const hint = await addTopicHint(linkId, topic);
    return { hint, addedAt: Date.now() };
  } catch (err) {
    return { error: readableCircleError(err) };
  }
}
