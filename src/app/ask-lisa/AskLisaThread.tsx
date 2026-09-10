'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { askLisaAction, type AskState } from './actions';
import type { CaregiverInquiry } from '@/lib/circle';

const TIER_TAG: Record<CaregiverInquiry['tier'], string> = {
  general_wellbeing: 'How she seems',
  flagged: 'Already flagged',
  medication_conditions: 'Medication & conditions',
  verbatim: 'What she said',
};

function Bubble({ inquiry }: { inquiry: CaregiverInquiry }) {
  return (
    <>
      <div className="chat-bubble mine">
        <span className="chat-bubble-who">You asked</span>
        <span className="chat-bubble-text">{inquiry.question}</span>
      </div>
      <div className="chat-bubble hers">
        <span className="chat-bubble-who">Lisa</span>
        <span className="chat-bubble-text">{inquiry.answerText}</span>
        <span className="chat-bubble-tag" style={{ color: inquiry.declined ? '#7A2E22' : 'var(--ink-3)' }}>
          {inquiry.declined ? "Didn't share — " : ''}
          {TIER_TAG[inquiry.tier]}
        </span>
      </div>
    </>
  );
}

export function AskLisaThread({
  linkId,
  seniorName,
  initialInquiries,
}: {
  linkId: string;
  seniorName: string;
  initialInquiries: CaregiverInquiry[];
}) {
  const [inquiries, setInquiries] = useState(initialInquiries);
  const boundAction = askLisaAction.bind(null, linkId);
  const initialState: AskState = {};
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const seenAskedAt = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state.inquiry && state.askedAt !== seenAskedAt.current) {
      seenAskedAt.current = state.askedAt;
      setInquiries((prev) => [...prev, state.inquiry!]);
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <>
      {inquiries.length === 0 && (
        <div className="card">
          <h2>Nothing asked yet</h2>
          <p className="muted">
            Ask something below and Lisa will answer right away, within what she&rsquo;s allowed to
            share. {seniorName} is told you asked either way.
          </p>
        </div>
      )}

      {inquiries.map((inquiry) => (
        <div key={inquiry.inquiryId} className="card" style={{ marginBottom: 14 }}>
          <Bubble inquiry={inquiry} />
        </div>
      ))}

      <div className="card">
        <form action={formAction} ref={formRef}>
          <label htmlFor="question">Ask about {seniorName}</label>
          <textarea
            id="question"
            name="question"
            rows={3}
            maxLength={500}
            placeholder="How has she seemed this week?"
            required
          />
          <button type="submit" disabled={pending} style={{ maxWidth: 200 }}>
            {pending ? 'Asking…' : 'Ask Lisa'}
          </button>
        </form>
        {state.error && <div className="error">{state.error}</div>}
      </div>
    </>
  );
}
