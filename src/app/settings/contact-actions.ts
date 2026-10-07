'use server';
import { revalidatePath } from 'next/cache';
import { currentCaregiver } from '@/lib/session';
import { updateContactDetails } from '@/lib/circle';

export type ContactDetailsState = { error?: string; message?: string };
export async function contactDetailsAction(linkId: string, _previous: ContactDetailsState, form: FormData): Promise<ContactDetailsState> {
  if (!(await currentCaregiver())) return { error: 'Please sign in again.' };
  try {
    await updateContactDetails(linkId, {
      caregiverName: String(form.get('caregiverName') ?? '').trim(),
      caregiverContactPhone: String(form.get('caregiverContactPhone') ?? '').trim(),
    });
    revalidatePath('/settings');
    return { message: 'Contact details saved. Open My People on the senior\'s phone to review them.' };
  } catch (error) { return { error: (error as Error).message }; }
}
