'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './viewer.module.css';

type SharedEvent = { files: { url: string; filename: string; contentType: string }[];
  metadata: { cameraName: string; timestamp: string; timeZone: string; description: string; eventId: string; expiresAt: string } };

export function SharedEventViewer({ code }: { code: string }) {
  const [event, setEvent] = useState<SharedEvent>();
  const [error, setError] = useState('');
  const [part, setPart] = useState(0);
  const busy = useRef(false);
  const controller = useRef<AbortController | undefined>(undefined);
  const refresh = useCallback(async (renew = false) => {
    if (busy.current || !code) return;
    busy.current = true;
    const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 15000);
    try {
      const response = await fetch(`/s/${code}/media`, { cache: 'no-store', signal: abort.signal });
      if (!response.ok) throw new Error(response.status === 404 ? 'This link has expired, was revoked, or its event is unavailable.' : 'This event could not be checked. Try again.');
      const next = await response.json() as SharedEvent;
      setEvent(previous => !renew && previous ? { ...next, files: previous.files } : next); setError('');
    } catch (e) { if (!abort.signal.aborted || controller.current === abort) { setEvent(undefined); setError(e instanceof Error ? e.message : 'Event unavailable.'); } }
    finally { clearTimeout(timeout); busy.current = false; }
  }, [code]);
  useEffect(() => { void refresh(); const timer = setInterval(() => void refresh(), 10000);
    return () => { clearInterval(timer); controller.current?.abort(); controller.current = undefined; };
  }, [refresh]);
  const file = event?.files[part];
  return <main className={styles.page}>
    <h1>Lisa &amp; Me</h1>
    {!event ? <><p role="status">{error || (code ? 'Loading shared event...' : 'This link is unavailable.')}</p><button onClick={() => void refresh(true)}>Retry</button></>
      : <>
        <section className={styles.media} aria-label="Shared event media">
          {file?.contentType === 'video/mp4' ? <video key={part} src={file.url} controls playsInline preload="metadata" onEnded={() => setPart(p => Math.min(p + 1, event.files.length - 1))} onError={() => setError('Playback access may have expired. Reload media to retry.')} />
            : file?.contentType === 'image/jpeg' ? <img src={file.url} alt="Shared camera event" /> : <p>Unsupported media.</p>}
        </section>
        {event.files.length > 1 && <nav className={styles.parts} aria-label="Recording parts"><button disabled={part === 0} onClick={() => setPart(p => p - 1)}>Previous</button><span>Part {part + 1} of {event.files.length}</span><button disabled={part === event.files.length - 1} onClick={() => setPart(p => p + 1)}>Next</button></nav>}
        <h2>{event.metadata.cameraName}</h2>
        <p>{event.metadata.timestamp} ({event.metadata.timeZone})</p>
        {event.metadata.description && <details><summary>Event description</summary><p>{event.metadata.description}</p></details>}
        <p>Expires {event.metadata.expiresAt}</p>
        {error && <p role="alert">{error}</p>}
        <button onClick={() => void refresh(true)}>Reload media</button>
      </>}
  </main>;
}
