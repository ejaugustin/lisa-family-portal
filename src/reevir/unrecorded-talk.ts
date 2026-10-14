import type { TalkState } from './talk-session';
export interface LiveTalkControl { toggle(): void; mute(): void; dispose(): void }

// The camera confirms short speaker leases, never a recording or upload lease.
export function createUnrecordedTalk(peer: RTCPeerConnection, changed: (state: TalkState, supported: boolean, message?: string) => void): LiveTalkControl {
  const audio = peer.addTransceiver('audio', { direction: 'sendrecv' });
  const channel = peer.createDataChannel('lisa-talk-v1', { ordered: true });
  let state: TalkState = 'MUTED', supported = false, disposed = false, generation = 0, sequence = 0;
  let notice: string | undefined;
  let stream: MediaStream | undefined, track: MediaStreamTrack | undefined;
  let operation: Promise<void> | undefined;
  let cleanup = Promise.resolve();
  let expiry: ReturnType<typeof setTimeout> | undefined;
  let pending: { id: number; sent: number; grant: boolean; resolve?: (expires: number) => void; reject?: (error: Error) => void } | undefined;
  const report = (next: TalkState, message?: string) => { state = next; notice = message; if (!disposed) changed(next, supported, notice); };
  const mute = () => {
    generation++; clearTimeout(expiry);
    if (track) track.enabled = false;
    stream?.getTracks().forEach(item => item.stop()); stream = undefined; track = undefined;
    pending?.reject?.(new Error('Talk cancelled.')); pending = undefined;
    if (channel.readyState === 'open') channel.send(JSON.stringify({ type: 'STOP' }));
    cleanup = (operation ?? Promise.resolve()).then(() => audio.sender.replaceTrack(null)).catch(() => undefined);
    report('MUTED');
  };
  const fail = (message: string) => { mute(); report('UNAVAILABLE', message); };
  const applyExpiry = (expires: number) => {
    clearTimeout(expiry);
    expiry = setTimeout(() => fail('Camera audio confirmation expired. Tap Talk to try again.'), Math.max(0, expires - Date.now()));
  };
  const send = (grant: boolean, resolve?: (expires: number) => void, reject?: (error: Error) => void) => {
    pending = { id: ++sequence, sent: Date.now(), grant, resolve, reject };
    channel.send(JSON.stringify({ type: grant ? 'START' : 'STATUS', id: pending.id }));
  };
  channel.onmessage = event => {
    if (disposed || typeof event.data !== 'string' || event.data.length > 512) return;
    let reply;
    try { reply = JSON.parse(event.data); } catch { return; }
    if (!reply || reply.type !== 'STATUS' || reply.id !== pending?.id) return;
    const request = pending!; pending = undefined; supported = reply.supported === true;
    if (request.grant) {
      const expires = request.sent + (typeof reply.leaseMs === 'number' ? Math.min(1000, Math.max(0, reply.leaseMs)) : 0);
      if (!supported || reply.ready !== true || expires <= Date.now()) {
        const message = typeof reply.reason === 'string' && reply.reason.trim() ? reply.reason.slice(0, 400) : 'Camera audio is unavailable or busy. Talk was not started. Close and reopen Lisa Vision on the camera phone, then reconnect.';
        const failure = Object.assign(new Error(message), { retryable: reply.retryable === true });
        request.reject?.(failure);
        if (state === 'TALKING') fail(message);
      } else if (request.resolve) request.resolve(expires);
      else if (state === 'TALKING') applyExpiry(expires);
    }
    if (!disposed) changed(state, supported, notice);
  };
  const timer = setInterval(() => {
    if (disposed || channel.readyState !== 'open') return;
    if (pending) {
      if (Date.now() - pending.sent > 1200) {
        pending.reject?.(new Error('The camera did not confirm audio.')); pending = undefined;
        if (state === 'TALKING') fail('Camera audio confirmation was lost.');
      }
      return;
    }
    if (state !== 'PREPARING') send(state === 'TALKING');
  }, 300);
  channel.onclose = () => { supported = false; fail('Camera audio connection ended.'); };
  channel.onerror = () => { supported = false; fail('Camera audio connection failed.'); };
  async function start(epoch: number) {
    const current = () => !disposed && epoch === generation;
    let acquired: MediaStream | undefined;
    let enabled = false;
    try {
      await cleanup; if (!current()) return;
      acquired = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      const microphone = acquired.getAudioTracks()[0];
      if (!microphone) throw new Error('Microphone unavailable.');
      microphone.enabled = false;
      if (!current()) return;
      stream = acquired; track = microphone;
      await audio.sender.replaceTrack(microphone); if (!current()) return;
      const deadline = Date.now() + 8000;
      let expires = 0;
      while (current() && !expires) {
        try {
          expires = await new Promise<number>((resolve, reject) => {
            if (channel.readyState !== 'open' || !supported) { reject(new Error('Camera audio is unavailable.')); return; }
            send(true, resolve, reject);
          });
        } catch (error) {
          if (!current()) return;
          if (!(typeof error === 'object' && error !== null && 'retryable' in error && error.retryable === true) || Date.now() >= deadline) throw error;
          report('PREPARING', 'Finishing the current recording before unrecorded Talk...');
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      if (!current()) return;
      if (expires <= Date.now()) throw new Error('Camera audio confirmation expired.');
      applyExpiry(expires); microphone.enabled = true; enabled = true;
      report('TALKING', 'Microphone on. Talk is not recorded.');
    } catch (error) {
      if (current()) {
        const name = typeof error === 'object' && error !== null && 'name' in error ? error.name : '';
        fail(name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Microphone access is blocked in this browser. Allow Microphone in this site\'s browser settings, then tap Talk again. The senior\'s Talk permission is separate.'
          : name === 'NotFoundError' ? 'No microphone was found on this computer. Connect one, then tap Talk again.'
          : name === 'NotReadableError' ? 'Your microphone is unavailable or in use. Check your computer\'s microphone settings, then tap Talk again.'
          : error instanceof Error ? error.message : 'Talk could not start.');
      }
    } finally {
      if (!enabled) acquired?.getTracks().forEach(item => { item.enabled = false; item.stop(); });
    }
  }
  return {
    toggle() {
      if (disposed) return;
      if (state === 'TALKING' || state === 'PREPARING') { mute(); return; }
      if (!supported || operation) return;
      const epoch = ++generation; report('PREPARING');
      const job = start(epoch).finally(() => { if (operation === job) operation = undefined; }); operation = job;
    },
    mute,
    dispose() { if (disposed) return; disposed = true; clearInterval(timer); mute(); channel.close(); },
  };
}
