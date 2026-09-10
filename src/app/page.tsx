import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';

export default async function Home() {
  const caregiver = await currentCaregiver();
  redirect(caregiver ? '/dashboard' : '/sign-in');
}
