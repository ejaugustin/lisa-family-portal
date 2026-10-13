export type Camera = { cameraId: string; name?: string; allowLiveRecording?: boolean };
export type LiveSession = { sessionId: string; status: string; expiresAt: string; iceServers: RTCIceServer[] };
type Signals = { liveSession: LiveSession; signals: { sequence: number; sender: string; type: string; payload: unknown }[] };
export function createGateway(linkId: string) {
  const root = `/api/vision/${encodeURIComponent(linkId)}`;
  async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    if (!/^\/live-sessions(?:\/[a-zA-Z0-9_-]+(?:\/(?:renew|signals))?)?$/.test(path)) throw new Error('This camera control is not available.');
    const response = await fetch(root + path, { method, cache: 'no-store', headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!response.ok) throw Object.assign(new Error(response.status === 403 || response.status === 410 ? 'Live permission ended or was revoked.' : 'Camera connection unavailable. Check sharing and camera status.'), { status: response.status });
    return response.json() as Promise<T>;
  }
  return {
    preview: false,
    mutate: request,
    signal: (id: string, type: string, payload: unknown) => request(`/live-sessions/${encodeURIComponent(id)}/signals`, 'POST', { type, payload }),
    liveSignals: async (id: string, after: number): Promise<Signals> => {
      const response = await fetch(`${root}/live-sessions/${encodeURIComponent(id)}/signals?after=${after}`, { cache: 'no-store' });
      if (!response.ok) throw Object.assign(new Error('Live access ended or the camera disconnected.'), { status: response.status });
      const body = await response.json();
      return { ...body, signals: body.signals.map((signal: any) => ({ ...signal, sender: signal.from })) };
    },
  };
}
