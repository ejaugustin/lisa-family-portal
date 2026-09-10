import 'server-only';
import { cookies } from 'next/headers';

// The server stores only a hash of a pairing code, so the API can hand back
// the plaintext exactly once, at the moment it is minted. That is the right
// call for the database and the wrong experience for a daughter who closed
// the tab before she got her mother on the phone.
//
// The compromise: her own browser keeps the last code she was given, in an
// httpOnly cookie no script can read. It is her code, on her machine, and it
// dies with the browser session. If she loses it anyway she makes a new one —
// which is a normal thing to do, not a failure.

const COOKIE = 'lisa_last_code';
const RECOVERY_COOKIE = 'lisa_last_recovery_code';

export type LastCode = { linkId: string; code: string };

export async function rememberCode(value: LastCode): Promise<void> {
  (await cookies()).set(COOKIE, JSON.stringify(value), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

export async function recallCode(): Promise<LastCode | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LastCode;
  } catch {
    return null;
  }
}

export async function forgetCode(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

// LISA-ID-002, Layer 3 — the same "her own browser remembers it" compromise,
// for the lost-phone recovery code. A separate cookie on purpose: the two
// codes mean very different things (a caregiver-linking invite vs. a
// device-adoption code), and losing one must never surface the other's
// value on the wrong page.
export type LastRecoveryCode = { linkId: string; code: string; expiresAt: number; devicesRevoked: number };

export async function rememberRecoveryCode(value: LastRecoveryCode): Promise<void> {
  (await cookies()).set(RECOVERY_COOKIE, JSON.stringify(value), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

export async function recallRecoveryCode(): Promise<LastRecoveryCode | null> {
  const raw = (await cookies()).get(RECOVERY_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LastRecoveryCode;
  } catch {
    return null;
  }
}

export async function forgetRecoveryCode(): Promise<void> {
  (await cookies()).delete(RECOVERY_COOKIE);
}
