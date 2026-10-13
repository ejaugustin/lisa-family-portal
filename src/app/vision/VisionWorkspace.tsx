'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowClockwiseIcon, VideoCameraIcon } from '@phosphor-icons/react';
import type { VisionAccess, VisionEvent, VisionCamera } from '@/lib/vision';
import { LiveView } from '@/reevir/live-view';
import { RecordingPlayer } from './RecordingPlayer';
type Household = { linkId: string; name: string; access: VisionAccess };
export function VisionWorkspace({ mode, households, initialLinkId, initialCameraId }: { mode: 'check-in' | 'happenings'; households: Household[]; initialLinkId?: string; initialCameraId?: string }) {
  const initial = households.find(household => household.linkId === initialLinkId) ?? households[0];
  const [selected, setSelected] = useState(initial?.linkId ?? '');
  const [access, setAccess] = useState<VisionAccess | null>(initial?.access ?? null);
  const [events, setEvents] = useState<VisionEvent[]>([]);
  const [cursor, setCursor] = useState<string>();
  const [cameraId, setCameraId] = useState(initialCameraId ?? '');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [through, setThrough] = useState('');
  const [live, setLive] = useState<VisionCamera | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const root = `/api/vision/${encodeURIComponent(selected)}`;
  const cameraChoices = [...new Map([...(access?.cameras ?? []).map(camera => [camera.cameraId, `${camera.name} / ${camera.room}`] as const), ...events.map(event => [event.cameraId, event.room] as const)]).entries()];
  const read = useCallback(async (next?: string) => {
    if (!selected) return;
    const current = ++generation.current;
    setBusy(true); setError('');
    try {
      const response = await fetch(root, { cache: 'no-store' });
      if (!response.ok) throw new Error('Sharing ended or camera information is unavailable.');
      const info = await response.json() as VisionAccess;
      if (current !== generation.current) return;
      const allowed = mode === 'check-in' ? info.permissions.cameraStatus : info.permissions.eventHistory;
      if (!allowed) throw new Error('This information is no longer shared with you.');
      setAccess(info);
      if (!info.permissions.liveView) setLive(null);
      if (mode === 'happenings') {
        const query = new URLSearchParams({ limit: '30' });
        if (cameraId) query.set('cameraId', cameraId);
        if (type) query.set('type', type);
        if (from) query.set('from', `${from}T00:00:00.000Z`);
        if (through) query.set('through', `${through}T23:59:59.999Z`);
        if (next) query.set('cursor', next);
        const result = await fetch(`${root}/events?${query}`, { cache: 'no-store' });
        if (!result.ok) throw new Error('Event access ended or the selected events are unavailable.');
        const body = await result.json() as { events: VisionEvent[]; cursor?: string };
        if (current !== generation.current) return;
        setEvents(previous => next ? [...new Map([...previous, ...body.events].map(event => [event.id, event])).values()] : body.events);
        setCursor(body.cursor);
      }
    } catch (caught) {
      if (current !== generation.current) return;
      setLive(null); setAccess(null); setEvents([]); setCursor(undefined);
      setError(caught instanceof Error ? caught.message : 'Information unavailable.');
    } finally { if (current === generation.current) setBusy(false); }
  }, [selected, mode, root, cameraId, type, from, through]);
  useEffect(() => { setEvents([]); setCursor(undefined); setLive(null); void read(); return () => { generation.current++; }; }, [read]);
  useEffect(() => {
    if (mode !== 'check-in') return;
    const timer = setInterval(() => void read(), 10000);
    return () => clearInterval(timer);
  }, [read, mode]);
  if (!households.length) return <p>No camera {mode === 'check-in' ? 'access' : 'history'} has been shared with you.</p>;
  return <>
    <div className="vision-filters">
      <label>Household<select value={selected} onChange={event => { setLive(null); setAccess(null); setCameraId(''); setSelected(event.target.value); }}>{households.map(household => <option key={household.linkId} value={household.linkId}>{household.name}</option>)}</select></label>
      {mode === 'happenings' && <>
        <label>Camera<select value={cameraId} onChange={event => setCameraId(event.target.value)}><option value="">All shared cameras</option>{cameraChoices.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label>Event type<select value={type} onChange={event => setType(event.target.value)}><option value="">All event types</option>{['person', 'animal', 'vehicle', 'package', 'motion', 'fall_suspected', 'smoke_or_flame_possible', 'door_or_exit_activity'].map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
        <label>From (UTC)<input type="date" value={from} onChange={event => setFrom(event.target.value)} /></label>
        <label>Through (UTC)<input type="date" value={through} onChange={event => setThrough(event.target.value)} /></label>
      </>}
      <button disabled={busy} title="Refresh" aria-label="Refresh" onClick={() => void read()}><ArrowClockwiseIcon size={22} /></button>
    </div>
    {error && <p role="alert">{error}</p>}
    {mode === 'check-in' && <div className="vision-camera-grid">{access?.cameras.map(camera => <article key={camera.cameraId} className="vision-camera">
      <h2>{camera.name}</h2><p>{camera.room} / {camera.status} / {camera.securityState === 'PRIVACY' ? 'Privacy' : camera.securityState === 'DISARMED' ? 'Paused' : 'Observing'}</p>
      <p>Heartbeat {camera.lastSeenISO ? new Date(camera.lastSeenISO).toLocaleString() : 'Not reported'}</p>
      <p>Battery {camera.batteryPercent === undefined ? 'Not reported' : `${camera.batteryPercent}%`} / {camera.power ?? 'Not reported'}</p>
      {access.permissions.liveView && <button disabled={camera.status !== 'online' || camera.securityState === 'PRIVACY'} onClick={() => setLive(camera)}><VideoCameraIcon size={20} /> Start live check-in</button>}
      <details><summary>Camera health</summary>{Object.entries(camera.health ?? {}).map(([key, value]) => <p key={key}>{key}: {String(value)}</p>)}</details>
      {access.permissions.eventHistory && <a href={`/happenings?linkId=${encodeURIComponent(selected)}&cameraId=${encodeURIComponent(camera.cameraId)}`}>View happenings</a>}
    </article>)}</div>}
    {mode === 'happenings' && <>
      <p>Past 30 days</p>
      {!busy && access && events.length === 0 && <p>No happenings on this page match the selection.</p>}
      <div className="vision-event-list">{events.map(event => <article key={event.id} className="vision-event"><h2>{event.summary}</h2>
        <p>{event.room} / <time dateTime={event.detectedAtISO}>{new Date(event.detectedAtISO).toLocaleString()}</time></p>
        <details><summary>Event details</summary><p>{event.type} / {event.recordingStatus}</p><p>Camera: {event.cameraId}</p>{event.description && <p>{event.description}</p>}{event.provenance && <p>Classification: {event.provenance.classifier}{event.provenance.confidence === undefined ? '' : ` / ${Math.round(event.provenance.confidence * 100)}% confidence`}</p>}</details>
        {event.canViewRecording ? <RecordingPlayer linkId={selected} eventId={event.id} /> : <p>{event.recordingStatus === 'saving' ? 'Recording saving' : 'No recording shared'}</p>}
      </article>)}</div>
      {cursor && <button disabled={busy} onClick={() => void read(cursor)}>Load more</button>}
    </>}
    {busy && <p role="status">Loading...</p>}
    {live && access?.permissions.liveView && <LiveView key={`${selected}:${live.cameraId}`} linkId={selected} camera={{ ...live, allowLiveRecording: false }} viewOnly onClose={() => setLive(null)} />}
  </>;
}
