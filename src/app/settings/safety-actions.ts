'use server';
import { currentCaregiver } from '@/lib/session';
import { safetyContactRequest, type SafetyContact } from '@/lib/safety-contacts';
export type SafetyState = { contact?: SafetyContact; message?: string; error?: string; signInRequired?: boolean };
export async function safetyContactAction(linkId: string, previous: SafetyState, form: FormData): Promise<SafetyState> {
  try {
    if (!(await currentCaregiver())) return { ...previous, error: 'Your session expired. Sign in again, then check your saved preferences.', message: undefined, signInRequired: true };
    const action = String(form.get('action') ?? '');
    if (!['consent', 'request-code', 'confirm-code'].includes(action)) return { ...previous, error: 'Invalid action.', message: undefined };
    const result = await safetyContactRequest(linkId, action, {
      phone: String(form.get('phone') ?? ''), code: String(form.get('code') ?? ''),
      smsConsent: form.get('smsConsent') === 'on', pushConsent: form.get('pushConsent') === 'on',
    });
    return { contact: result.contact ?? previous.contact, message: result.message ?? (action === 'consent' ? 'Consent preferences saved.' : 'Mobile number verified.') };
  } catch (error) { return { contact: previous.contact, error: (error as Error).message }; }
}
