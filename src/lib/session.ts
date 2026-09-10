import 'server-only';
import { cookies } from 'next/headers';
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { env } from './env';
import { refresh } from './cognito';
import type { Tokens } from './cognito';

// The session lives in httpOnly cookies that JavaScript can never read, and
// deliberately WITHOUT a Domain attribute — host-only, so it is scoped to
// caregiver.lisaandme.com and cannot travel to the marketing site or the admin
// portal. Scoping it to .lisaandme.com for convenience would mean a compromise
// of the marketing site reaches a family's health information.

const ID_COOKIE = 'lisa_id';
const RT_COOKIE = 'lisa_rt';

const verifier = CognitoJwtVerifier.create({
  userPoolId: env('COGNITO_USER_POOL_ID'),
  tokenUse: 'id',
  clientId: env('COGNITO_CLIENT_ID'),
});

export type Caregiver = { sub: string; email: string; name: string };

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export async function setSession(tokens: Tokens): Promise<void> {
  const jar = await cookies();
  jar.set(ID_COOKIE, tokens.idToken, { ...COOKIE_BASE, maxAge: 60 * 60 });
  if (tokens.refreshToken) {
    jar.set(RT_COOKIE, tokens.refreshToken, { ...COOKIE_BASE, maxAge: 60 * 60 * 24 * 30 });
  }
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ID_COOKIE);
  jar.delete(RT_COOKIE);
}

/**
 * Who is asking, or null. Verifies the token's signature against Cognito's
 * public keys rather than trusting its contents — a cookie is attacker-supplied
 * data until proven otherwise.
 */
export async function currentCaregiver(): Promise<Caregiver | null> {
  const jar = await cookies();
  const idToken = jar.get(ID_COOKIE)?.value;

  if (idToken) {
    try {
      const claims = await verifier.verify(idToken);
      return {
        sub: String(claims.sub),
        email: String(claims.email ?? ''),
        name: String(claims.name ?? ''),
      };
    } catch {
      // Expired or tampered with. Fall through to the refresh attempt.
    }
  }

  const refreshToken = jar.get(RT_COOKIE)?.value;
  if (!refreshToken || !idToken) return null;

  // The refresh call needs the subject, which is inside the expired token. It
  // is not trusted for anything — only used as the key for the secret hash,
  // and the result is verified properly before anyone is let in.
  const sub = subjectFromUnverified(idToken);
  if (!sub) return null;

  try {
    const tokens = await refresh(refreshToken, sub);
    const claims = await verifier.verify(tokens.idToken);
    const jar2 = await cookies();
    jar2.set(ID_COOKIE, tokens.idToken, { ...COOKIE_BASE, maxAge: 60 * 60 });
    return {
      sub: String(claims.sub),
      email: String(claims.email ?? ''),
      name: String(claims.name ?? ''),
    };
  } catch {
    return null;
  }
}

function subjectFromUnverified(jwt: string): string | null {
  try {
    const payload = jwt.split('.')[1];
    if (!payload) return null;
    const json = Buffer.from(payload, 'base64url').toString('utf8');
    const sub = JSON.parse(json)?.sub;
    return typeof sub === 'string' ? sub : null;
  } catch {
    return null;
  }
}
