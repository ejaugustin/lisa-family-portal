import 'server-only';
import { cookies } from 'next/headers';

/**
 * PROTOTYPE ONLY — a stand-in for the `lisa-caregiver-links` table.
 *
 * This exists so the caregiver journey can be walked through and judged
 * before any of it is built for real. It stores one pretend link in a cookie.
 * Nothing here is authoritative, nothing is shared between devices, and none
 * of it reaches the senior's app.
 *
 * When the real thing lands, this file is deleted and the page components
 * keep their shape — they already only read through these four functions.
 */

const COOKIE = 'lisa_preview_link';

export type LinkStatus = 'awaiting' | 'connected' | 'declined';

export type PreviewLink = {
  seniorName: string;
  /** Everything below is optional on purpose — see startLink(). */
  approxAge?: string;
  livesAlone?: string;
  code: string;
  status: LinkStatus;
  createdAt: string;
};

/**
 * Deliberately excludes I, O, 0 and 1 — this is read aloud down a phone line
 * by one person and typed by another, often an older one.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newPairingCode(): string {
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${out.slice(0, 3)}-${out.slice(3)}`;
}

export async function getLink(): Promise<PreviewLink | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PreviewLink;
  } catch {
    return null;
  }
}

export async function saveLink(link: PreviewLink): Promise<void> {
  (await cookies()).set(COOKIE, JSON.stringify(link), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });
}

export async function clearLink(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
