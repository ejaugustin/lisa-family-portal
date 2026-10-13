'use client';
import { useEffect, useRef, useState } from 'react';

type Manifest = { detectedAtISO: string; parts: { index: number; durationMs: number; url: string }[] };
export function RecordingPlayer({ linkId, eventId }: { linkId: string; eventId: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [part, setPart] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const request = useRef<AbortController | null>(null);
  const path = `/api/vision/${encodeURIComponent(linkId)}/events/${encodeURIComponent(eventId)}/recording`;
  useEffect(() => () => { sequence.current++; request.current?.abort(); video.current?.pause(); }, []);
  useEffect(() => {
    if (!manifest) return;
    const media = video.current;
    const abort = new AbortController();
    const timer = setInterval(() => {
      void fetch(path, { cache: 'no-store', signal: abort.signal }).then(response => {
        if (!abort.signal.aborted && !response.ok) { video.current?.pause(); setManifest(null); setError('Recording access ended or is unavailable.'); }
      }).catch(() => { if (!abort.signal.aborted) { video.current?.pause(); setManifest(null); setError('Recording access could not be checked.'); } });
    }, 10000);
    return () => { clearInterval(timer); abort.abort(); media?.pause(); };
  }, [manifest, path]);
  async function load(index: number) {
    request.current?.abort();
    const abort = new AbortController(); request.current = abort;
    const run = ++sequence.current;
    const timeout = setTimeout(() => abort.abort(), 12000);
    setBusy(true); setError('');
    try {
      const response = await fetch(path, { cache: 'no-store', signal: abort.signal });
      if (!response.ok) throw new Error(response.status === 403 ? 'Recording permission is no longer available.' : 'This recording is not available.');
      const result = await response.json() as Manifest;
      if (sequence.current !== run) return;
      if (!Array.isArray(result.parts) || !result.parts[index]?.url || !result.parts.every(item => typeof item.url === 'string' && item.url.startsWith('https://'))) throw new Error('This recording has no playable parts.');
      setManifest(result); setPart(index);
    } catch (caught) {
      if (sequence.current !== run) return;
      video.current?.pause(); setManifest(null);
      setError(caught instanceof Error ? caught.message : 'Recording unavailable.');
    } finally { clearTimeout(timeout); if (sequence.current === run) setBusy(false); }
  }
  return <div style={{ marginTop: 12 }}>
    {!manifest ? <button disabled={busy} onClick={() => void load(0)}>{busy ? 'Loading recording...' : 'Open recording'}</button> : <>
      <p>Detected {new Date(manifest.detectedAtISO).toLocaleString()} · Part {part + 1} of {manifest.parts.length}</p>
      <video ref={video} key={manifest.parts[part].url} src={manifest.parts[part].url} controls controlsList="nodownload noremoteplayback" playsInline preload="metadata"
        style={{ display: 'block', width: '100%', aspectRatio: '16 / 9', background: '#000' }}
        onError={() => setError('Playback failed. Reopen the recording to refresh access.')} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
        <button disabled={busy || part === 0} onClick={() => void load(part - 1)}>Previous part</button>
        <button disabled={busy || part === manifest.parts.length - 1} onClick={() => void load(part + 1)}>Next part</button>
        <button onClick={() => { sequence.current++; request.current?.abort(); video.current?.pause(); setManifest(null); setBusy(false); setError(''); }}>Close recording</button>
      </div>
    </>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
