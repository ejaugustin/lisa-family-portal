'use server';
import { revalidatePath } from 'next/cache';
import { currentCaregiver } from '@/lib/session';
import { updateContactDetails } from '@/lib/circle';

export type ContactDetailsState = { error?: string; message?: string; signInRequired?: boolean };
export async function contactDetailsAction(linkId: string, _previous: ContactDetailsState, form: FormData): Promise<ContactDetailsState> {
  try {
    if (!(await currentCaregiver())) return { error: 'Your session expired. Please sign in again.', signInRequired: true };
    await updateContactDetails(linkId, {
      caregiverName: String(form.get('caregiverName') ?? '').trim(),
      caregiverContactPhone: String(form.get('caregiverContactPhone') ?? '').trim(),
    });
    revalidatePath('/settings');
    return { message: 'Contact details saved. Open My People on the senior\'s phone to review them.' };
  } catch (error) { return { error: (error as Error).message }; }
}
