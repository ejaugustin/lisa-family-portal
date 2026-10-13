import { SharedVisionPage } from '../vision/SharedVisionPage';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: { searchParams: Promise<{ linkId?: string; cameraId?: string }> }) {
  const query = await searchParams;
  return <SharedVisionPage mode="look-in" initialLinkId={query.linkId} initialCameraId={query.cameraId} />;
}
