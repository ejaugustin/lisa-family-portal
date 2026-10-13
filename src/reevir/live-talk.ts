import { TalkSession, type TalkState, type TalkRecordingLease } from "./talk-session";

export interface LiveTalkControl {
  toggle: () => void;
  dispose: () => void;
}

/** Bound to exactly one peer; status replies are correlated, timed, and never reused. */
export function createLiveTalk(
  peer: RTCPeerConnection,
  changed: (state: TalkState, supported: boolean, message?: string) => void
): LiveTalkControl {
  const audio = peer.addTransceiver("audio", { direction: "sendrecv" });
  const channel = peer.createDataChannel("reevir-talk-v2", { ordered: true });
  let stream: MediaStream | undefined;
  let track: MediaStreamTrack | undefined;
  let state: TalkState = "MUTED";
  let supported = false;
  let notice: string | undefined;
  let disposed = false;
  let sequence = 0;
  let pending: { id: number; sent: number; grant: boolean; prepare?: boolean; resolve?: (lease: TalkRecordingLease) => void; reject?: (error: Error) => void } | undefined;
  const stop = (): Promise<void> => {
    if (channel.readyState === "open") channel.send(JSON.stringify({ type: "STOP" }));
    return Promise.resolve();
  };
  const controller = new TalkSession({
    now: Date.now,
    changed: (next, message) => { state = next; notice = message; if (!disposed) changed(next, supported, message); },
    acquireMicrophone: async () => {
      const acquired = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      const acquiredTrack = acquired.getAudioTracks().at(0);
      if (acquiredTrack === undefined) { acquired.getTracks().forEach(item => { item.stop(); }); throw new Error("Microphone unavailable."); }
      acquiredTrack.enabled = false;
      stream = acquired; track = acquiredTrack;
      return {
        setEnabled: (enabled) => { acquiredTrack.enabled = enabled; },
        stop: () => { acquired.getTracks().forEach((item) => { item.stop(); });  if (stream === acquired) stream = undefined; }
      };
    },
    prepareRecording: () => new Promise<TalkRecordingLease>((resolve, reject) => {
      if (disposed || !supported || channel.readyState !== "open") { reject(new Error("This Camera build does not support recorded talk.")); return; }
      if (pending !== undefined) { pending.reject?.(new Error("Talk request replaced.")); pending = undefined; }
      pending = { id: ++sequence, sent: Date.now(), grant: true, prepare: true, resolve, reject };
      channel.send(JSON.stringify({ type: "PREPARE", id: pending.id }));
    }),
    attach: async () => { if (disposed || track === undefined) throw new Error("Live view ended."); await audio.sender.replaceTrack(track); },
    detach: async () => { await audio.sender.replaceTrack(null); }
  });
  channel.onmessage = (event: unknown) => {
    const data = (event as { data?: unknown }).data;
    if (disposed || typeof data !== "string" || data.length > 512) return;
    let reply: { type?: unknown; id?: unknown; supported?: unknown; ready?: unknown; leaseMs?: unknown } | null;
    try { reply = JSON.parse(data) as typeof reply; } catch { return; }
    if (reply === null || reply.type !== "STATUS" || pending === undefined || reply.id !== pending.id) return;
    const request = pending; pending = undefined;
    supported = reply.supported === true;
    if (request.prepare && supported && reply.ready === true) {
      pending = { ...request, id: ++sequence, sent: Date.now(), prepare: false };
      channel.send(JSON.stringify({ type: "GRANT", id: pending.id }));
      return;
    }
    if (request.grant) {
      // Count from send time: network delay can shorten, never lengthen, a grant.
      const expiresAt = request.sent + (typeof reply.leaseMs === "number" ? Math.min(1000, reply.leaseMs) : 0);
      if (reply.ready !== true || !supported || expiresAt <= Date.now()) {
        request.reject?.(new Error("The camera could not save the conversation. Try again shortly."));
        if (state === "TALKING") controller.recordingFailed();
        void stop();
      } else if (request.resolve !== undefined) request.resolve({ expiresAt, release: stop });
      else controller.renew(expiresAt);
    }
    changed(state, supported, notice);
  };
  const timer = setInterval(() => {
    if (disposed || channel.readyState !== "open") return;
    if (pending !== undefined) {
      if (Date.now() - pending.sent > (pending.prepare ? 12000 : 1200)) {
        pending.reject?.(new Error("Camera did not confirm talk recording.")); pending = undefined;
        void stop();
        if (state === "TALKING") controller.recordingFailed();
      }
      return;
    }
    if (state === "PREPARING") return;
    pending = { id: ++sequence, sent: Date.now(), grant: state === "TALKING" };
    channel.send(JSON.stringify({ type: pending.grant ? "GRANT" : "STATUS", id: pending.id }));
  }, 300);
  channel.onclose = () => { controller.recordingFailed(); };
  channel.onerror = () => { controller.recordingFailed(); };
  return {
    toggle: () => {
      if (disposed) return;
      if (state === "TALKING" || state === "PREPARING") {
        controller.mute(); pending?.reject?.(new Error("Talk cancelled.")); pending = undefined; void stop();
      }
      else if (supported) void controller.start();
    },
    dispose: () => {
      disposed = true;
      clearInterval(timer);
      pending?.reject?.(new Error("Live view ended.")); pending = undefined;
      controller.dispose();
      void stop(); channel.close();
    }
  };
}
