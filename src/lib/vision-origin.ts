// Amplify may pass an internal URL to Next. Trust the configured public site,
// never a caller-supplied forwarded host, when checking authenticated mutations.
export function visionMutationOriginAllowed(request: Request, production = process.env.NODE_ENV === 'production'): boolean {
  const origin = request.headers.get('origin');
  if (origin === 'https://family.lisaandme.com') return true;
  if (production || !origin) return false;
  try {
    const site = new URL(request.url);
    return ['localhost', '127.0.0.1', '[::1]'].includes(site.hostname) && origin === site.origin;
  } catch { return false; }
}
