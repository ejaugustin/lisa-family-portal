import 'server-only';
import { cookies } from 'next/headers';
import { env } from './env';

// The portal's window onto LISA-CIRCLE-001.
//
// Every call carries the caregiver's Cognito ID token and is authorised at
// the API's edge, so the portal never has to be trusted to say who is asking.
// It also means this file holds no secrets and no household ids — it can only
// reach rows the token's subject already owns.

const API = () => env('LISA_API_URL').replace(/\/+$/, '');

export type LinkStatus = 'awaiting' | 'proposed' | 'connected' | 'declined' | 'revoked';

export type CircleLink = {
  linkId: string;
  status: LinkStatus;
  seniorName: string;
  createdAt: string;
  connectedAt?: string;
  declinedAt?: string;
  expiresAt: number;
};

async function authHeader(): Promise<Record<string, string>> {
  const idToken = (await cookies()).get('lisa_id')?.value;
  if (!idToken) throw new Error('not signed in');
  return { authorization: `Bearer ${idToken}`, 'content-type': 'application/json' };
}

export async function listLinks(): Promise<CircleLink[]> {
  const res = await fetch(`${API()}/caregiver/links`, {
    headers: await authHeader(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`links list failed: ${res.status}`);
  const body = (await res.json()) as { links?: CircleLink[] };
  return body.links ?? [];
}

/** Returns the plaintext code. It is shown once and never stored anywhere. */
export async function createLink(input: {
  seniorName: string;
  approxAge?: string;
  livesAlone?: string;
}): Promise<{ linkId: string; code: string; expiresAt: number }> {
  const res = await fetch(`${API()}/caregiver/links`, {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify(input),
    cache: 'no-store',
  });
  if (res.status === 429) throw new CircleError('too_many_open_codes');
  if (!res.ok) {
    // TEMPORARY DIAGNOSTIC (2026-09-10): capture the real status + body so
    // the UI can show it instead of the generic fallback message — remove
    // once the "Get her code" failure is root-caused. See readableCircleError.
    const bodyText = await res.text().catch(() => '');
    throw new CircleError(`failed:${res.status}:${bodyText.slice(0, 300)}`);
  }
  return res.json();
}

// LISA-ID-002, Layer 3 — "her phone was lost." Immediately revokes every
// device on her household (the caregiver is asserting the old phone is gone
// right now) and returns a one-hour, one-time code to read to her over the
// phone once she has Lisa & Me installed again — on this phone or a
// borrowed one, it does not matter which.
export async function issueLostPhoneCode(
  linkId: string,
): Promise<{ code: string; expiresAt: number; devicesRevoked: number }> {
  const res = await fetch(`${API()}/caregiver/links/${encodeURIComponent(linkId)}/lost-phone-code`, {
    method: 'POST',
    headers: await authHeader(),
    cache: 'no-store',
  });
  if (!res.ok) throw new CircleError('failed');
  return res.json();
}

export async function revokeLink(linkId: string): Promise<void> {
  const res = await fetch(`${API()}/caregiver/links/${encodeURIComponent(linkId)}/revoke`, {
    method: 'POST',
    headers: await authHeader(),
    cache: 'no-store',
  });
  if (!res.ok) throw new CircleError('failed');
}

export type InquiryTier = 'general_wellbeing' | 'flagged' | 'medication_conditions' | 'verbatim';

export type CaregiverInquiry = {
  inquiryId: string;
  question: string;
  tier: InquiryTier;
  answerText: string;
  declined: boolean;
  createdAt: string;
  disclosedToSeniorAt: string | null;
};

/**
 * Asks Lisa a question about the senior, on this caregiver's behalf, through
 * `lisa-caregiver-inquiry-handler`. The answer comes back immediately — tier
 * classification and the honest response are decided server-side, from a
 * fixed policy, never fabricated. `disclosedToSeniorAt` is null until Lisa
 * actually mentions the check-in to her, which happens on her own next turn,
 * not synchronously with this call.
 */
export async function askLisa(linkId: string, question: string): Promise<CaregiverInquiry> {
  const res = await fetch(`${API()}/caregiver/links/${encodeURIComponent(linkId)}/inquiries`, {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ question }),
    cache: 'no-store',
  });
  if (res.status === 404) throw new CircleError('not_found');
  if (res.status === 409) throw new CircleError('not_connected');
  if (!res.ok) throw new CircleError('failed');
  return res.json();
}

export async function listInquiries(linkId: string): Promise<CaregiverInquiry[]> {
  const res = await fetch(`${API()}/caregiver/links/${encodeURIComponent(linkId)}/inquiries`, {
    headers: await authHeader(),
    cache: 'no-store',
  });
  if (!res.ok) throw new CircleError('failed');
  const body = (await res.json()) as { inquiries?: CaregiverInquiry[] };
  return body.inquiries ?? [];
}

export type EscalationTier = 1 | 2 | 3 | 4 | 5;

export type EscalationEvent = {
  eventId: string;
  tier: EscalationTier;
  trigger: 'silence';
  status: 'open' | 'resolved';
  openedAt: string;
  resolvedAt: string | null;
  resolvedBy: 'contact_resumed' | 'manual' | null;
  outcome: string | null;
  /**
   * LISA-SAFETY-002 — the real, generated plain-language sentence for this
   * event, computed server-side (backend's shared/escalation.ts). Replaces
   * the old client-side per-tier lookup table in alerts/page.tsx.
   */
  reasoningText: string;
  hoursSinceContact: number;
};

export async function listAlerts(linkId: string): Promise<EscalationEvent[]> {
  const res = await fetch(`${API()}/caregiver/links/${encodeURIComponent(linkId)}/alerts`, {
    headers: await authHeader(),
    cache: 'no-store',
  });
  if (!res.ok) throw new CircleError('failed');
  const body = (await res.json()) as { events?: EscalationEvent[] };
  return body.events ?? [];
}

export type TopicHint = {
  hintId: string;
  topic: string;
  createdAt: string;
  deliveredAt: string | null;
};

export async function addTopicHint(linkId: string, topic: string): Promise<TopicHint> {
  const res = await fetch(`${API()}/caregiver/links/${encodeURIComponent(linkId)}/topic-hints`, {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ topic }),
    cache: 'no-store',
  });
  if (res.status === 404) throw new CircleError('not_found');
  if (res.status === 409) throw new CircleError('not_connected');
  if (!res.ok) throw new CircleError('failed');
  return res.json();
}

export async function listTopicHints(linkId: string): Promise<TopicHint[]> {
  const res = await fetch(`${API()}/caregiver/links/${encodeURIComponent(linkId)}/topic-hints`, {
    headers: await authHeader(),
    cache: 'no-store',
  });
  if (!res.ok) throw new CircleError('failed');
  const body = (await res.json()) as { hints?: TopicHint[] };
  return body.hints ?? [];
}

export type VisitNoteKind = 'symptom' | 'question' | 'change';

export type VisitNote = {
  id: string;
  text: string;
  kind: VisitNoteKind;
  firstMentionedISO: string;
  lastMentionedISO: string;
  mentions: number;
  broughtUpISO?: string;
};

export async function listVisitNotes(linkId: string): Promise<VisitNote[]> {
  const res = await fetch(`${API()}/caregiver/links/${encodeURIComponent(linkId)}/visit-notes`, {
    headers: await authHeader(),
    cache: 'no-store',
  });
  if (!res.ok) throw new CircleError('failed');
  const body = (await res.json()) as { notes?: VisitNote[] };
  return body.notes ?? [];
}

export class CircleError extends Error {}

/** Plain English for a worried family member, not an error code. */
export function readableCircleError(err: unknown): string {
  if (err instanceof CircleError && err.message === 'too_many_open_codes') {
    return 'There are already a few codes waiting to be used. Use one of those, or end one first.';
  }
  if (err instanceof CircleError && err.message === 'not_connected') {
    return "You'll be able to do that once she's confirmed the connection.";
  }
  const base = 'Something went wrong at our end. Nothing has changed — please try again in a moment.';
  // TEMPORARY DIAGNOSTIC (2026-09-10): appends the real status/body captured
  // in createLink above so we can see why the backend call failed without
  // digging through CloudWatch. Remove this suffix once root-caused.
  if (err instanceof CircleError && err.message.startsWith('failed:')) {
    return `${base} [debug: ${err.message}]`;
  }
  return base;
}
