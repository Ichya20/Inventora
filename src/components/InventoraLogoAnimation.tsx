import React, { lazy, Suspense, useEffect, useState } from 'react';
import { InventoraMark } from './InventoraMark';

const LogoPlayer = lazy(() => import('./InventoraLogoPlayer').catch(() => ({ default: () => null })));

export function InventoraLogoAnimation({ reveal, paused = false }: { reveal: boolean; paused?: boolean }) {
  const [ready, setReady] = useState(false);
  const [complete, setComplete] = useState(false);
  useEffect(() => { if (!reveal) { setReady(false); setComplete(false); } }, [reveal]);

  return <div aria-hidden="true" className={`opening-logo ${ready && reveal ? 'is-playing' : ''} ${ready && complete && reveal ? 'is-idle' : ''} ${paused ? 'is-paused' : ''}`}>
    <InventoraMark size={288} />
    {reveal && <Suspense fallback={null}><LogoPlayer onReady={setReady} onComplete={setComplete} paused={paused} /></Suspense>}
  </div>;
}
