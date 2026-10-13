export type Camera = { cameraId: string; name?: string; allowLiveRecording?: boolean; supportsTalk?: boolean };
export type LiveSession = { sessionId: string; status: string; expiresAt: string; iceServers: RTCIceServer[]; talkAllowed?: boolean };
type Signals = { liveSession: LiveSession; signals: { sequence: number; sender: string; type: string; payload: unknown }[] };
async function liveError(response: Response): Promise<Error> {
  const body = await response.json().catch(() => ({}));
  const messages: Record<string, string> = {
    origin_denied: 'The portal rejected this live-view request. Refresh the page and retry.',
    unauthorized: 'Your portal session ended. Sign in again to start live viewing.',
    billing_required: 'Your portal account needs billing confirmation before live viewing.',
    camera_offline: 'The camera is offline. Open Lisa Vision on the camera phone.',
    camera_backgrounded: 'Open Lisa Vision on the camera phone and keep it in the foreground.',
    camera_private: 'Privacy is on. Live viewing is unavailable.',
    live_access_denied: 'Live viewing is not shared for this room.',
    talk_access_denied: 'Talk permission is required for this room. Ask the senior to enable it in Family sharing.',
    talk_camera_update_required: 'Update Lisa Vision on the camera phone to enable unrecorded Talk.',
    access_denied: 'This household is no longer shared with your caregiver account.',
    access_revoked: 'Live permission ended or was revoked.',
    session_expired: 'This live session ended. Reconnect to start a new one.',
  };
  return Object.assign(new Error(messages[body.error] || (response.status === 403 ? 'Live viewing is not authorized for this request.' : response.status === 410 ? 'This live session ended. Reconnect to retry.' : 'Camera connection unavailable. Check sharing and camera status.')), { status: response.status });
}
export function createGateway(linkId: string) {
  const root = `/api/vision/${encodeURIComponent(linkId)}`;
  async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    if (!/^\/live-sessions(?:\/[a-zA-Z0-9_-]+(?:\/(?:renew|signals))?)?$/.test(path)) throw new Error('This camera control is not available.');
    const response = await fetch(root + path, { method, cache: 'no-store', headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!response.ok) throw await liveError(response);
    return response.json() as Promise<T>;
  }
  return {
    preview: false,
    mutate: request,
    signal: (id: string, type: string, payload: unknown) => request(`/live-sessions/${encodeURIComponent(id)}/signals`, 'POST', { type, payload }),
    liveSignals: async (id: string, after: number): Promise<Signals> => {
      const response = await fetch(`${root}/live-sessions/${encodeURIComponent(id)}/signals?after=${after}`, { cache: 'no-store' });
      if (!response.ok) throw await liveError(response);
      const body = await response.json();
      return { ...body, signals: body.signals.map((signal: any) => ({ ...signal, sender: signal.from })) };
    },
  };
}
