export async function submitSettingsAction<T extends { error?: string; message?: string }>(
  action: () => Promise<T>, previous: T,
): Promise<T> {
  try { return await action(); }
  catch {
    // A transport failure can happen after a write. Do not retry it automatically.
    return { ...previous, message: undefined, error: 'Unable to confirm whether your settings were saved. Reload Settings, sign in again if asked, and check your preferences before retrying.' };
  }
}
