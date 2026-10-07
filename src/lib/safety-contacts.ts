import 'server-only';
import { cookies } from 'next/headers';
import { env } from './env';

export type SafetyContact = {
  portalDetailsChanged?: boolean;
  name: string; phone: string; role: 'none' | 'primary' | 'backup'; authorized: boolean;
  verifiedAt?: string; smsConsent: boolean; pushConsent: boolean;
  smsRequested: boolean; pushRequested: boolean; smsSetupComplete: boolean;
};
export async function safetyContactRequest(linkId: string, action?: string, input?: Record<string, unknown>): Promise<{ contact?: SafetyContact | null; message?: string }> {
  const token = (await cookies()).get('lisa_id')?.value;
  if (!token) throw new Error('Please sign in again.');
  const response = await fetch(`${env('LISA_API_URL').replace(/\/+$/, '')}/caregiver/links/${encodeURIComponent(linkId)}/safety-contact${action ? `/${action}` : ''}`, {
    method: action ? 'POST' : 'GET', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, cache: 'no-store',
    ...(input ? { body: JSON.stringify(input) } : {}),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Safety-contact settings are unavailable.');
  return body;
}
