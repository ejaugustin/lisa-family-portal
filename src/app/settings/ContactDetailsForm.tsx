'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import type { CircleLink } from '@/lib/circle';
import { contactDetailsAction, type ContactDetailsState } from './contact-actions';
import { submitSettingsAction } from './submit-settings-action';

export function ContactDetailsForm({ link, fallbackName }: { link: CircleLink; fallbackName: string }) {
  const [state, action, pending] = useActionState(
    (previous: ContactDetailsState, form: FormData) => submitSettingsAction(() => contactDetailsAction(link.linkId, previous, form), previous),
    {} as ContactDetailsState,
  );
  return <section className="card" aria-label={`Your contact details for ${link.seniorName}`}>
    <h2>Your contact details for {link.seniorName}</h2>
    <form action={action}>
      <fieldset disabled={pending} style={{ border: 0, padding: 0, minWidth: 0 }}>
        <label htmlFor={`name-${link.linkId}`}>Your name</label>
        <input id={`name-${link.linkId}`} name="caregiverName" autoComplete="name" defaultValue={link.caregiverName || fallbackName} maxLength={100} required />
        <label htmlFor={`phone-${link.linkId}`}>Your mobile number</label>
        <input id={`phone-${link.linkId}`} name="caregiverContactPhone" type="tel" autoComplete="tel" defaultValue={link.caregiverContactPhone || ''} maxLength={80} required />
        <button type="submit">{pending ? 'Saving...' : 'Save my contact details'}</button>
      </fieldset>
    </form>
    {state.error ? <p role="alert">{state.error}</p> : null}
    {state.signInRequired ? <Link href="/sign-in">Sign in again</Link> : null}
    {state.message ? <p role="status">{state.message}</p> : null}
    <p className="muted">Your approved connection imports these details into My People. A changed number needs the senior to review and save contact settings again, then you verify it and confirm notification consent here.</p>
  </section>;
}
