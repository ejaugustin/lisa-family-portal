'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowClockwiseIcon, VideoCameraIcon } from '@phosphor-icons/react';
import type { VisionAccess, VisionCamera, VisionEvent } from '@/lib/vision';
import { LiveView } from '@/reevir/live-view';
import { RecordingPlayer } from './RecordingPlayer';

type Household = { linkId: string; name: string; access: VisionAccess };
export function LookInWorkspace({ households, initialLinkId, initialCameraId }: {
  households: Household[]; initialLinkId?: string; initialCameraId?: string;
}) {
  const initial = households.find(item => item.linkId === initialLinkId) ?? households[0];
  const [linkId, setLinkId] = useState(initial?.linkId ?? '');
  const [roomId, setRoomId] = useState(initialCameraId ?? initial?.access.cameras[0]?.cameraId ?? '');
  const [access, setAccess] = useState<VisionAccess | null>(initial?.access ?? null);
  const [events, setEvents] = useState<VisionEvent[]>([]);
  const [eventRooms, setEventRooms] = useState<[string, string][]>([]);
  const [cursor, setCursor] = useState<string>();
  const [live, setLive] = useState<VisionCamera | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sequence = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const root = `/api/vision/${encodeURIComponent(linkId)}`;
  const rooms = [...new Map([...(access?.cameras ?? []).map(camera => [camera.cameraId, camera.room || camera.name] as [string, string]), ...(access?.permissions.cameraStatus ? [] : eventRooms)]).entries()];
  const camera = access?.cameras.find(item => item.cameraId === roomId);

  const read = useCallback(async (next?: string) => {
    if (!linkId) return;
    pending.current?.abort();
    const abort = new AbortController(); pending.current = abort;
    const run = ++sequence.current;
    const timeout = setTimeout(() => abort.abort(), 12000);
    setBusy(true); setError('');
    try {
      const response = await fetch(root, { cache: 'no-store', signal: abort.signal });
      if (!response.ok) throw new Error('Room access is unavailable or no longer shared.');
      const info = await response.json() as VisionAccess;
      if (sequence.current !== run) return;
      setAccess(info);
      setLive(previous => previous && info.permissions.liveView && info.cameras.some(item => item.cameraId === previous.cameraId && item.status === 'online' && item.securityState !== 'PRIVACY' && item.securityState !== 'DISARMED') ? previous : null);
      if (info.permissions.cameraStatus && roomId && !info.cameras.some(item => item.cameraId === roomId)) {
        setEvents([]); setEventRooms([]); setCursor(undefined); setRoomId(info.cameras[0]?.cameraId ?? '');
        return;
      }
      if (info.permissions.eventHistory) {
        const selected = roomId || info.cameras[0]?.cameraId;
        const query = new URLSearchParams({ limit: '30' });
        if (selected) query.set('cameraId', selected);
        if (next) query.set('cursor', next);
        const result = await fetch(`${root}/events?${query}`, { cache: 'no-store', signal: abort.signal });
        if (!result.ok) throw new Error('These events are unavailable or no longer shared.');
        const body = await result.json() as { events: VisionEvent[]; cursor?: string };
        if (sequence.current !== run) return;
        if (!selected && body.events.length) {
          setEventRooms([...new Map(body.events.map(event => [event.cameraId, event.room] as [string, string])).entries()]);
          setRoomId(body.events[0].cameraId);
          return;
        }
        if (!roomId && selected) setRoomId(selected);
        setEvents(previous => next ? [...new Map([...previous, ...body.events].map(event => [event.id, event])).values()] : body.events);
        setCursor(body.cursor);
      } else { setEvents([]); setEventRooms([]); setCursor(undefined); }
    } catch (caught) {
      if (sequence.current !== run) return;
      setAccess(null); setLive(null); setEvents([]); setEventRooms([]); setCursor(undefined);
      setError(caught instanceof Error ? caught.message : 'Look-In is unavailable.');
    } finally { clearTimeout(timeout); if (pending.current === abort) pending.current = null; if (sequence.current === run) setBusy(false); }
  }, [linkId, roomId, root]);

  useEffect(() => {
    setAccess(null); setEvents([]); setCursor(undefined); setLive(null);
    void read();
    return () => { sequence.current++; pending.current?.abort(); };
  }, [read]);
  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden && !pending.current) void read(); }, 10000);
    return () => clearInterval(timer);
  }, [read]);
  if (!households.length) return <p>No rooms have been shared with you. The senior can grant access in Lisa &amp; Me under Vision's Family sharing settings.</p>;

  return <>
    <div className="vision-filters">
      <label>Household<select value={linkId} onChange={event => { setAccess(null); setEvents([]); setEventRooms([]); setLive(null); setRoomId(''); setLinkId(event.target.value); }}>{households.map(item => <option key={item.linkId} value={item.linkId}>{item.name}</option>)}</select></label>
      <label>Room<select value={roomId} disabled={!rooms.length} onChange={event => { setLive(null); setEvents([]); setRoomId(event.target.value); }}>{!rooms.length && <option value="">No rooms shared</option>}{rooms.map(([id, room]) => <option key={id} value={id}>{room}</option>)}</select></label>
      <button disabled={busy} title="Refresh Look-In" aria-label="Refresh Look-In" onClick={() => void read()}><ArrowClockwiseIcon size={22} /></button>
    </div>
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">Loading room information...</p>}
    {camera && <section className="look-in-room" aria-label="Selected room">
      <div><h2>{camera.room || camera.name}</h2><p>{camera.status === 'online' ? 'Online' : camera.status === 'offline' ? 'Offline' : 'Connection unknown'} / {camera.securityState === 'PRIVACY' ? 'Privacy' : camera.securityState === 'DISARMED' ? 'Paused' : 'Observing'}</p>
      {camera.lastSeenISO && <p>Last camera contact <time dateTime={camera.lastSeenISO}>{new Date(camera.lastSeenISO).toLocaleString()}</time></p>}</div>
      {access?.permissions.liveView ? <button disabled={camera.status !== 'online' || camera.securityState === 'PRIVACY' || camera.securityState === 'DISARMED'} onClick={() => setLive(camera)}><VideoCameraIcon size={22} /> Live look-in</button> : <p>Live viewing is not shared for this room.</p>}
    </section>}
    {access && <section aria-label="Room events"><h2>Events{camera ? ` / ${camera.room || camera.name}` : ''}</h2>
      {!access.permissions.eventHistory ? <p>Event history is not shared with you.</p> : <>
        {!busy && !events.length && <p>No shared events for this room.</p>}
        {events.map(event => <article key={`${linkId}:${event.id}`} className="vision-event"><h3>{event.summary}</h3><p>{event.room} / <time dateTime={event.detectedAtISO}>{new Date(event.detectedAtISO).toLocaleString()}</time></p>
          {event.description && <details><summary>Description</summary><p>{event.description}</p></details>}
          {event.canViewRecording && access.permissions.recordings ? <RecordingPlayer key={`${linkId}:${event.id}`} linkId={linkId} eventId={event.id} /> : <p>{event.recordingStatus === 'saving' ? 'Recording is still saving.' : 'No recording available or shared.'}</p>}
        </article>)}
        {cursor && <button disabled={busy} onClick={() => void read(cursor)}>Load more events</button>}
      </>}
    </section>}
    {live && access?.permissions.liveView && <LiveView key={`${linkId}:${live.cameraId}`} linkId={linkId} camera={{ ...live, allowLiveRecording: false }} viewOnly onClose={() => setLive(null)} />}
  </>;
}
