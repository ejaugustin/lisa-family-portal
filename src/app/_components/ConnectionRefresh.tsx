'use client';

import { useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function ConnectionRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') startTransition(() => router.refresh());
    };
    const timer = window.setInterval(refresh, 5000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [router]);
  return <div>
    <p className="muted">This page checks for her answer automatically every few seconds.</p>
    <button type="button" className="secondary" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
      {pending ? 'Checking connection…' : 'Check connection now'}
    </button>
  </div>;
}
