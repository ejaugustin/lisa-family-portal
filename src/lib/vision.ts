import 'server-only';
import { cookies } from 'next/headers';
import { env } from './env';

export type VisionCamera = {
  cameraId: string;
  name: string;
  room: string;
  status: 'online' | 'offline' | 'unknown';
  lastSeenISO?: string;
  securityState?: string;
  batteryPercent?: number;
  power?: string;
  health?: Record<string, string | number | boolean>;
  latestSnapshot?: { url: string; capturedAtISO: string; orientation?: string };
};

export type VisionEvent = {
  id: string;
  cameraId: string;
  room: string;
  type: string;
  summary: string;
  detectedAtISO: string;
  recordingStatus: 'ready' | 'saving' | 'unavailable';
  canViewRecording: boolean;
  description?: string;
  provenance?: { classifier: string; confidence?: number; timestamp: string };
};

export type VisionAccess = {
  permissions: { cameraStatus: boolean; eventHistory: boolean; recordings: boolean; liveView: boolean; talk?: boolean };
  cameras: VisionCamera[];
};

export async function caregiverFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = (await cookies()).get('lisa_id')?.value;
  if (!token) throw new Error('not_signed_in');
  return fetch(`${env('LISA_API_URL').replace(/\/+$/, '')}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    cache: 'no-store',
  });
}

export async function getVisionRecording(linkId: string, eventId: string): Promise<Response> {
  return caregiverFetch(`/caregiver/links/${encodeURIComponent(linkId)}/vision/events/${encodeURIComponent(eventId)}/recording`);
}

export async function getVisionAccess(linkId: string): Promise<VisionAccess | null> {
  const response = await caregiverFetch(`/caregiver/links/${encodeURIComponent(linkId)}/vision`);
  if (response.status === 403 || response.status === 404) return null;
  if (!response.ok) throw new Error(`vision_access_failed:${response.status}`);
  return response.json() as Promise<VisionAccess>;
}

export async function getVisionEvents(linkId: string): Promise<VisionEvent[] | null> {
  const response = await caregiverFetch(`/caregiver/links/${encodeURIComponent(linkId)}/vision/events?limit=30`);
  if (response.status === 403 || response.status === 404) return null;
  if (!response.ok) throw new Error(`vision_events_failed:${response.status}`);
  const body = await response.json() as { events?: VisionEvent[] };
  return body.events ?? [];
}
