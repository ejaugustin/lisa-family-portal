'use client';
import { useActionState } from 'react';
import type { SafetyContact } from '@/lib/safety-contacts';
import { safetyContactAction } from './safety-actions';

export function SafetyContactForm({ linkId, seniorName, initial }: { linkId: string; seniorName: string; initial: SafetyContact }) {
  const [state, action, pending] = useActionState(safetyContactAction.bind(null, linkId), { contact: initial });
  const contact = state.contact ?? initial;
  return <section className="card" aria-label={`Safety contact for ${seniorName}`}>
    <h2>Safety contact for {seniorName}</h2>
    <p>{contact.name} · {contact.role === 'none' ? 'No safety role' : contact.role === 'primary' ? 'Primary contact' : 'Backup contact'}</p>
    <p>Mobile: {contact.phone} · {contact.verifiedAt ? 'Verified' : 'Not verified'}</p>
    <p>Household authorization: {contact.authorized ? 'Granted' : 'Not granted'}</p>
    <form action={action}>
      <input type="hidden" name="action" value="consent" />
      <input type="hidden" name="phone" value={contact.phone} />
      <fieldset disabled={pending} style={{ border: 0, padding: 0 }}>
        <legend>Your notification consent</legend>
        <label style={{ display: 'flex', gap: 12, alignItems: 'start', margin: '16px 0' }}><input style={{ width: 'auto' }} type="checkbox" name="smsConsent" defaultChecked={contact.smsConsent} />I agree to receive Lisa &amp; Me safety texts for this household at the number above. Message and data rates may apply. I can withdraw consent here.</label>
        <label style={{ display: 'flex', gap: 12, alignItems: 'start', margin: '16px 0' }}><input style={{ width: 'auto' }} type="checkbox" name="pushConsent" defaultChecked={contact.pushConsent} />I agree to receive safety push notifications for this household.</label>
        <button type="submit">Save my consent</button>
      </fieldset>
    </form>
    {!contact.verifiedAt && contact.authorized ? <>
      <form action={action}>
        <input type="hidden" name="action" value="request-code" /><input type="hidden" name="phone" value={contact.phone} />
        <button type="submit" disabled={pending}>Send verification text</button>
      </form>
      <form action={action}>
        <input type="hidden" name="action" value="confirm-code" /><input type="hidden" name="phone" value={contact.phone} />
        <label>Verification code<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={pending} /></label>
        <button type="submit" disabled={pending}>Verify my number</button>
      </form>
    </> : null}
    {state.error ? <p role="alert">{state.error}</p> : null}
    {state.message ? <p role="status">{state.message}</p> : null}
    <p className="muted">{contact.smsSetupComplete ? 'SMS contact setup is confirmed.' : 'SMS setup still requires the number, role, household permission, requested channel, and your consent.'} Safety SMS escalation and caregiver push delivery are not enabled by this form. Recording and live-view permissions stay separate.</p>
  </section>;
}
