'use client';
import { useEffect, useRef, useState } from "react";
import { MicrophoneIcon, MicrophoneSlashIcon, XIcon, ArrowClockwiseIcon, ArrowsOutSimpleIcon, RecordIcon, StopCircleIcon } from "@phosphor-icons/react";
import { createGateway, type Camera, type LiveSession } from "./gateway";
import { createUnrecordedTalk, type LiveTalkControl } from "./unrecorded-talk";
import type { TalkState } from "./talk-session";

const SIGNAL_POLL_MS = 2_500;
const SIGNAL_RETRY_MS = 3_000;

function isTransientServiceError(cause: unknown): boolean {
  const status = typeof cause === "object" && cause !== null && "status" in cause ? Number(cause.status) : 0;
  return status === 429 || status === 502 || status === 503 || status === 504;
}

async function retryThrottled<T>(operation: () => Promise<T>, isDisposed: () => boolean): Promise<T> {
  let delay = 500;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (cause) {
      if (!isTransientServiceError(cause) || attempt >= 5 || isDisposed()) throw cause;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 4_000);
    }
  }
}

export function LiveView({ camera, linkId, eventId, onClose, viewOnly = false, allowTalk = false }: { camera: Camera; linkId: string; eventId?: string; onClose: () => void; viewOnly?: boolean; allowTalk?: boolean }) {
  const api = createGateway(linkId);
  const video = useRef<HTMLVideoElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const talk = useRef<LiveTalkControl | undefined>(undefined);
  const recorder = useRef<{ toggle: () => void; dispose: () => void } | undefined>(undefined);
  const [retry, setRetry] = useState(0);
  const [status, setStatus] = useState("Connecting");
  const [error, setError] = useState("");
  const [talkState, setTalkState] = useState<TalkState>("MUTED");
  const [supported, setSupported] = useState(false);
  const [talkNotice, setTalkNotice] = useState<string>();
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingSupported, setRecordingSupported] = useState(false);
  const liveSessionRef = useRef<string | undefined>(undefined);
  const [lightActive, setLightActive] = useState(false);
  const [lightExpiresAt, setLightExpiresAt] = useState<number | null>(null);
  const [lightNotice, setLightNotice] = useState("");
  useEffect(() => {
    if (!recording) return undefined;
    const timer = setInterval(() => setRecordingSeconds(value => value + 1), 1_000);
    return () => clearInterval(timer);
  }, [recording]);
  useEffect(() => {
    if (!lightActive || lightExpiresAt === null) return undefined;
    const timer = setInterval(() => {
      const remaining = lightExpiresAt - Date.now();
      if (remaining <= 0) {
        setLightActive(false); setLightExpiresAt(null); setLightNotice("Camera light turned off after 10 minutes.");
      } else if (remaining <= 60_000) {
        setLightNotice("Camera light will turn off in less than a minute.");
      }
    }, 1_000);
    return () => clearInterval(timer);
  }, [lightActive, lightExpiresAt]);
  const changeLight = (action: "ON" | "OFF" | "EXTEND") => {
    const sessionId = liveSessionRef.current;
    if (!sessionId || api.preview) return;
    void api.mutate(`/cameras/${encodeURIComponent(camera.cameraId)}/live-light`, "POST", { sessionId, action })
      .then(() => {
        if (action === "OFF") { setLightActive(false); setLightExpiresAt(null); setLightNotice("Camera light is off."); }
        else { setLightActive(true); setLightExpiresAt(Date.now() + 10 * 60_000); setLightNotice("Camera light is on. It will turn off after 10 minutes."); }
      })
      .catch((cause: unknown) => setLightNotice(cause instanceof Error ? cause.message : "Camera light could not be changed."));
  };
  useEffect(() => {
    const lifecycle = { disposed: false };
    const isDisposed = (): boolean => lifecycle.disposed;
    let sessionId: string | undefined, peer: RTCPeerConnection | undefined;
    let poll: ReturnType<typeof setTimeout> | undefined, renewal: ReturnType<typeof setTimeout> | undefined;
    let setup: ReturnType<typeof setTimeout> | undefined;
    let disconnectGrace: ReturnType<typeof setTimeout> | undefined;
    let watchdog: ReturnType<typeof setInterval> | undefined;
    let frameCallback: number | undefined;
    const media = video.current;
    const stop = () => {
      lifecycle.disposed = true; clearTimeout(poll); clearTimeout(renewal); clearTimeout(setup); clearTimeout(disconnectGrace);
      clearInterval(watchdog);
      if (frameCallback !== undefined) media?.cancelVideoFrameCallback(frameCallback);
      talk.current?.dispose(); talk.current = undefined;
      recorder.current?.dispose(); recorder.current = undefined;
      peer?.close();
      if (video.current) video.current.srcObject = null;
      if (sessionId) {
        void api.mutate(`/cameras/${encodeURIComponent(camera.cameraId)}/live-light`, "POST", { sessionId, action: "OFF" }).catch(() => undefined);
        void api.mutate(`/live-sessions/${encodeURIComponent(sessionId)}`, "DELETE").catch(() => undefined);
        sessionId = undefined; liveSessionRef.current = undefined;
      }
    };
    const fail = (cause: unknown) => { if (lifecycle.disposed) return; stop(); setStatus("Disconnected"); setError(cause instanceof Error ? cause.message : "Live connection ended."); setSupported(false); };
    const hide = () => { if (document.hidden) fail(new Error("Live view paused while this tab was hidden. Reconnect to resume.")); };
    const blur = () => { talk.current?.mute(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("visibilitychange", hide); document.addEventListener("keydown", escape);
    window.addEventListener("blur", blur);
    setError(""); setStatus("Connecting"); setSupported(false); setTalkState("MUTED"); setTalkNotice(undefined);
    if (api.preview) { setStatus("Preview"); setError("Live video requires a connected account and an online Camera device."); }
    else {
      setup = setTimeout(() => { fail(new Error("Camera did not connect. Check its connection and retry.")); }, 30000);
      void (async () => {
        const response = await retryThrottled(
          () => api.mutate<{ liveSession: LiveSession }>("/live-sessions", "POST", { cameraId: camera.cameraId, requestTalk: allowTalk && camera.supportsTalk === true, ...(eventId ? { eventId } : {}) }),
          isDisposed
        );
        if (lifecycle.disposed) { await api.mutate(`/live-sessions/${encodeURIComponent(response.liveSession.sessionId)}`, "DELETE"); return; }
        sessionId = response.liveSession.sessionId;
        liveSessionRef.current = sessionId;
        const id = sessionId;
        const connection = new RTCPeerConnection({ iceServers: response.liveSession.iceServers }); peer = connection;
        connection.addTransceiver("video", { direction: "recvonly" });
        if (allowTalk && response.liveSession.talkAllowed === true) talk.current = createUnrecordedTalk(connection, (state, available, message) => { if (!lifecycle.disposed) { setTalkState(state); setSupported(available); setTalkNotice(message); } });
        const stream = new MediaStream();
        const mimeType = [
          "video/mp4;codecs=avc3,mp4a.40.2",
          "video/mp4;codecs=avc3",
          "video/mp4;codecs=h264,aac",
          "video/mp4"
        ].find(type => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type));
        setRecordingSupported(!viewOnly && camera.allowLiveRecording === true && mimeType !== undefined);
        let activeRecorder: MediaRecorder | undefined;
        let chunks: Blob[] = [];
        const saveRecording = () => {
          if (chunks.length === 0 || mimeType === undefined) return;
          const blob = new Blob(chunks, { type: mimeType }); chunks = [];
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href = url; anchor.download = `${(camera.name ?? "Lisa-Vision").replace(/[^a-zA-Z0-9_-]+/gu, "-")}_${new Date().toISOString().replaceAll(":", "-")}.mp4`;
          anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 30_000);
          setTalkNotice("Live recording saved to this computer.");
        };
        recorder.current = {
          toggle: () => {
            if (activeRecorder?.state === "recording") { activeRecorder.stop(); setRecording(false); return; }
            if (mimeType === undefined || stream.getVideoTracks().length === 0) { setTalkNotice("MP4 live recording is unavailable in this browser."); return; }
            chunks = []; activeRecorder = new MediaRecorder(stream, { mimeType });
            activeRecorder.ondataavailable = event => { if (event.data.size > 0) chunks.push(event.data); };
            activeRecorder.onstop = saveRecording; activeRecorder.onerror = () => { setRecording(false); setTalkNotice("Live recording could not be saved."); };
            activeRecorder.start(1_000); setRecordingSeconds(0); setRecording(true); setTalkNotice("Recording this live view locally.");
          },
          dispose: () => { if (activeRecorder?.state === "recording") activeRecorder.stop(); }
        };
        connection.ontrack = event => {
          if (lifecycle.disposed) return;
          stream.addTrack(event.track);
          if (video.current) { video.current.srcObject = stream; void video.current.play().catch(() => { setError("Press Play to allow browser audio/video playback."); }); }
        };
        connection.onconnectionstatechange = () => {
          clearTimeout(disconnectGrace);
          if (connection.connectionState === "failed" || connection.connectionState === "closed") {
            fail(new Error("Live transport interrupted. Reconnect to retry."));
          } else if (connection.connectionState === "disconnected") {
            talk.current?.mute();
            setStatus("Reconnecting");
            disconnectGrace = setTimeout(() => fail(new Error("Live transport interrupted. Reconnect to retry.")), 8_000);
          } else if (connection.connectionState === "connected" && !lifecycle.disposed) {
            setStatus(receivedFrame ? "Live" : "Loading");
          }
        };
        let signalQueue: Promise<unknown> = Promise.resolve();
        connection.onicecandidate = event => {
          if (lifecycle.disposed || !event.candidate) return;
          const candidate = event.candidate.toJSON();
          signalQueue = signalQueue
            .then(() => retryThrottled(() => api.signal(id, "ICE_CANDIDATE", candidate), isDisposed))
            .catch(fail);
        };
        const offer = await connection.createOffer();
        if (isDisposed()) return;
        await connection.setLocalDescription(offer);
        if (isDisposed()) return;
        await retryThrottled(() => api.signal(id, "OFFER", { type: offer.type, sdp: offer.sdp }), isDisposed);
        let sequence = 0;
        let transientFailures = 0;
        let lastFrameAt = Date.now(), receivedFrame = false;
        const candidates: RTCIceCandidateInit[] = [];
        const readSignals = async () => {
          try {
            const result = await api.liveSignals(id, sequence);
            if (isDisposed()) return;
            transientFailures = 0;
            if (!receivedFrame) setError("");
            if (["ENDED", "EXPIRED"].includes(result.liveSession.status)) throw new Error("Live session ended.");
            for (const signal of result.signals) {
              sequence = Math.max(sequence, signal.sequence);
              if (signal.sender !== "CAMERA") continue;
              if (signal.type === "ANSWER") {
                const answer = signal.payload as RTCSessionDescriptionInit;
                if (!connection.remoteDescription) await connection.setRemoteDescription(answer);
                for (const candidate of candidates.splice(0)) await connection.addIceCandidate(candidate);
              } else if (signal.type === "ICE_CANDIDATE") {
                const candidate = signal.payload as RTCIceCandidateInit;
                if (connection.remoteDescription) await connection.addIceCandidate(candidate); else candidates.push(candidate);
              } else if (signal.type === "ENDED") throw new Error("Camera ended this session.");
            }
            if (!isDisposed()) poll = setTimeout(() => void readSignals(), SIGNAL_POLL_MS);
          } catch (cause) {
            if (isTransientServiceError(cause) && !isDisposed() && transientFailures < 10) {
              transientFailures += 1;
              setError("Live service is busy. Reconnecting automatically...");
              poll = setTimeout(() => void readSignals(), SIGNAL_RETRY_MS);
              return;
            }
            fail(cause);
          }
        };
        const renew = async () => {
          try { await api.mutate(`/live-sessions/${encodeURIComponent(id)}/renew`, "POST", {}); if (!lifecycle.disposed) renewal = setTimeout(() => void renew(), 15000); }
          catch (cause) {
            if (isTransientServiceError(cause) && !lifecycle.disposed) {
              renewal = setTimeout(() => void renew(), SIGNAL_RETRY_MS);
              return;
            }
            fail(cause);
          }
        };
        void readSignals(); renewal = setTimeout(() => void renew(), 10_000);
        const frame = () => {
          if (isDisposed()) return;
          receivedFrame = true; lastFrameAt = Date.now();
          clearTimeout(setup); setStatus("Live"); setError("");
          frameCallback = media?.requestVideoFrameCallback(frame);
        };
        if (media && typeof media.requestVideoFrameCallback === "function") frameCallback = media.requestVideoFrameCallback(frame);
        else if (media) media.ontimeupdate = () => { if (media.videoWidth > 0 && !isDisposed()) { receivedFrame = true; lastFrameAt = Date.now(); clearTimeout(setup); setStatus("Live"); } };
        watchdog = setInterval(() => {
          if (receivedFrame && Date.now() - lastFrameAt > 10000) fail(new Error("Video stopped advancing. Reconnect to see the current scene."));
        }, 2000);
      })().catch(fail);
    }
    return () => { stop(); document.removeEventListener("visibilitychange", hide); document.removeEventListener("keydown", escape); window.removeEventListener("blur", blur); };
    // A peer owns its lifecycle; rerenders must not restart a session.
  }, [camera.cameraId, camera.supportsTalk, linkId, eventId, retry, allowTalk]);
  const loading = status === "Connecting" || status === "Loading" || status === "Reconnecting";
  return <div className="live-overlay" ref={panel} role="dialog" aria-modal="true" aria-label={`Live: ${camera.name ?? camera.cameraId}`}>
    <header><h2>{camera.name ?? camera.cameraId}</h2><span role="status">{status}</span><button title="Stop live view" aria-label="Stop live view" onClick={onClose}><XIcon /> Stop live view</button></header>
    <div className="live-stage"><video ref={video} autoPlay playsInline controls controlsList="nodownload noremoteplayback" className="live-video" />{loading && <div className="live-loading" role="status"><span className="live-spinner" aria-hidden="true" /><strong>{status === "Reconnecting" ? "Reconnecting live view..." : "Loading live view..."}</strong><small>Contacting the camera and preparing a secure stream.</small></div>}</div>
    <p role={error ? "alert" : "status"}>{error || lightNotice || talkNotice || (talkState === "TALKING" ? "Microphone on / Talk is not recorded" : "")}</p>
    <footer>
      {!viewOnly && <button disabled={!recordingSupported || status !== "Live"} title={recordingSupported ? "Record live view to this computer" : "MP4 recording is unavailable in this browser"} onClick={() => recorder.current?.toggle()}>{recording ? <StopCircleIcon /> : <RecordIcon />}{recording ? ` Stop ${String(Math.floor(recordingSeconds / 60))}:${String(recordingSeconds % 60).padStart(2, "0")}` : " Record"}</button>}
      <button disabled={!allowTalk || !supported || status !== "Live" || recording} title={!allowTalk ? "The senior must enable Talk for this room." : camera.supportsTalk !== true ? "Update Lisa Vision on the camera phone to enable unrecorded Talk." : !supported ? "Waiting for camera audio to become ready." : "Speak through the camera phone. Talk is not recorded."} onClick={() => talk.current?.toggle()}>
        {talkState === "TALKING" ? <MicrophoneIcon /> : <MicrophoneSlashIcon />}{talkState === "PREPARING" ? "Cancel talk" : talkState === "TALKING" ? "Mute" : "Talk"}
      </button>
      <button onClick={() => setRetry(n => n + 1)}><ArrowClockwiseIcon /> Reconnect</button>
      <button title="Fullscreen" aria-label="Fullscreen" onClick={() => void panel.current?.requestFullscreen().catch(() => setError("Fullscreen is unavailable in this browser."))}><ArrowsOutSimpleIcon /></button>
    </footer>
  </div>;
}
