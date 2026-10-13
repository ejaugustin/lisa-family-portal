import { redirect } from 'next/navigation';
import { currentCaregiver } from '@/lib/session';
import { listLinks } from '@/lib/circle';
import { getVisionAccess } from '@/lib/vision';
import { PortalNav } from '../_components/PortalNav';
import { VisionWorkspace } from './VisionWorkspace';
import { LookInWorkspace } from './LookInWorkspace';
export async function SharedVisionPage({ mode, initialLinkId, initialCameraId }: { mode: 'check-in' | 'happenings' | 'look-in'; initialLinkId?: string; initialCameraId?: string }) {
  const caregiver = await currentCaregiver();
  if (!caregiver) redirect('/sign-in');
  const links = (await listLinks()).filter(link => link.status === 'connected');
  const shared = await Promise.all(links.map(async link => {
    const access = await getVisionAccess(link.linkId);
    const allowed = mode === 'look-in' ? access?.permissions.cameraStatus || access?.permissions.eventHistory : mode === 'check-in' ? access?.permissions.cameraStatus : access?.permissions.eventHistory;
    return allowed && access ? { linkId: link.linkId, name: link.seniorName, access } : null;
  }));
  return <><PortalNav active={mode} caregiverName={caregiver.name || caregiver.email} />
    <main className={`portal-main${mode === 'look-in' ? ' look-in-main' : ''}`}><h1>{mode === 'look-in' ? 'Look-In' : mode === 'check-in' ? 'Check-in' : 'Happenings'}</h1>
      {mode === 'look-in' ? <LookInWorkspace initialLinkId={initialLinkId} initialCameraId={initialCameraId} households={shared.filter((item): item is NonNullable<typeof item> => item !== null)} /> : <VisionWorkspace mode={mode} initialLinkId={initialLinkId} initialCameraId={initialCameraId} households={shared.filter((item): item is NonNullable<typeof item> => item !== null)} />}
    </main></>;
}
