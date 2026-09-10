'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { addTopicHintAction, type TopicHintState } from './actions';
import type { TopicHint } from '@/lib/circle';

function HintRow({ hint }: { hint: TopicHint }) {
  const created = new Date(hint.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <p style={{ margin: '0 0 4px', fontSize: 16 }}>{hint.topic}</p>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        Flagged {created}
        {' · '}
        {hint.deliveredAt
          ? `brought up ${new Date(hint.deliveredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
          : 'waiting for a natural moment'}
      </p>
    </div>
  );
}

export function TopicHintComposer({
  linkId,
  seniorName,
  initialHints,
}: {
  linkId: string;
  seniorName: string;
  initialHints: TopicHint[];
}) {
  const [hints, setHints] = useState(initialHints);
  const boundAction = addTopicHintAction.bind(null, linkId);
  const initialState: TopicHintState = {};
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const seenAddedAt = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state.hint && state.addedAt !== seenAddedAt.current) {
      seenAddedAt.current = state.addedAt;
      setHints((prev) => [state.hint!, ...prev]);
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <>
      <div className="card">
        <form action={formAction} ref={formRef}>
          <label htmlFor="topic">Something coming up for {seniorName}</label>
          <textarea
            id="topic"
            name="topic"
            rows={2}
            maxLength={200}
            placeholder="Her surgery is Thursday"
            required
          />
          <button type="submit" disabled={pending} style={{ maxWidth: 200 }}>
            {pending ? 'Flagging…' : 'Flag it for Lisa'}
          </button>
        </form>
        {state.error && <div className="error">{state.error}</div>}
      </div>

      {hints.length === 0 ? (
        <div className="card">
          <h2>Nothing flagged yet</h2>
          <p className="muted">
            Flag a subject above and Lisa may bring it up warmly, in her own words, next time it comes
            up naturally.
          </p>
        </div>
      ) : (
        hints.map((hint) => <HintRow key={hint.hintId} hint={hint} />)
      )}
    </>
  );
}
