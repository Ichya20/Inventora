import React, { useEffect, useRef, useState } from 'react';
import { DotLottieReact, setWasmUrl, type DotLottie } from '@lottiefiles/dotlottie-react';
import wasmUrl from '@lottiefiles/dotlottie-web/dotlottie-player.wasm?url';
import { inventoraLogoAnimation, inventoraLogoPlayback } from '../lib/inventoraLogo';

setWasmUrl(wasmUrl);

const renderConfig = { autoResize: true, freezeOnOffscreen: true };

export default function InventoraLogoPlayer({ onReady, onComplete, paused }: {
  onReady: (ready: boolean) => void;
  onComplete: (complete: boolean) => void;
  paused: boolean;
}) {
  const [player, setPlayer] = useState<DotLottie | null>(null);
  const pausedRef = useRef(paused);
  const finished = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
    if (!player?.isLoaded || finished.current) return;
    if (paused) player.pause(); else player.play();
  }, [paused, player]);

  useEffect(() => {
    if (!player) return;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      finished.current = false;
      player.setFrame(0);
      onReady(true);
      if (!pausedRef.current) player.play();
    };
    const complete = () => { finished.current = true; onComplete(true); };
    const fail = () => { player.pause(); onReady(false); };
    player.addEventListener('load', start);
    player.addEventListener('complete', complete);
    player.addEventListener('loadError', fail);
    player.addEventListener('renderError', fail);
    if (player.isLoaded) start();
    return () => {
      player.removeEventListener('load', start);
      player.removeEventListener('complete', complete);
      player.removeEventListener('loadError', fail);
      player.removeEventListener('renderError', fail);
    };
  }, [player, onReady, onComplete]);

  return <DotLottieReact data={inventoraLogoAnimation} autoplay={false} loop={false} speed={inventoraLogoPlayback.speed}
    dotLottieRefCallback={setPlayer} renderConfig={renderConfig} aria-hidden="true" />;
}
