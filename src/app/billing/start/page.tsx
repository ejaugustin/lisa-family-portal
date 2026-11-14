import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';
import { hasSavedPaymentMethod } from '@/lib/stripe';
import BillingStartForm from './BillingStartForm';

export default async function BillingStart() {
  const caregiver = await currentCaregiver();
  if (!caregiver) redirect('/sign-in');
  let ready: boolean;
  try { ready = await hasSavedPaymentMethod(caregiver.email); }
  catch {
    return <main className="shell"><h1>We couldn’t check your payment setup</h1>
      <p>Your account has not changed. Please try again; you do not need to add another card to resolve this error.</p>
      <Link href="/billing/start">Check again</Link></main>;
  }
  if (ready) redirect('/dashboard');
  return <BillingStartForm />;
}
