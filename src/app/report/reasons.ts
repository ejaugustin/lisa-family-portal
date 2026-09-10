// Shared between the report form and its confirmation page. Kept out of
// actions.ts because a "use server" file may only export async functions —
// REASONS and ReportState are plain runtime/type values, not server actions.
export type ReportState = { error?: string };

export const REASONS = [
  { id: 'moved-into-care', label: 'She has moved into care' },
  { id: 'family-wishes-stop', label: 'The family would like to stop' },
  { id: 'deceased', label: 'She has passed away' },
  { id: 'something-else', label: 'Something else' },
] as const;
