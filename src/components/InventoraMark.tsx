import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { workspaceMotion } from '../lib/motion';

// Preserve the original viewBox, rectangles, corner radius, and fill opacity.
export function InventoraMark({ size = 28, reveal = false, className = '' }: { size?: number; reveal?: boolean; className?: string }) {
  const reduced = useReducedMotion();
  const animated = reveal && !reduced;
  const tiles = [
    { x: 2, y: 2, opacity: 1, dx: -2, dy: -2 },
    { x: 14, y: 2, opacity: 0.15, dx: 2, dy: -2 },
    { x: 2, y: 14, opacity: 0.15, dx: -2, dy: 2 },
    { x: 14, y: 14, opacity: 1, dx: 2, dy: 2 },
  ];
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`inventora-mark ${className}`}>
    {tiles.map((tile, index) => <motion.rect key={index} x={tile.x} y={tile.y} width="8" height="8" rx="1.5"
      fill="currentColor" fillOpacity={tile.opacity}
      initial={animated ? { opacity: 0, x: tile.dx, y: tile.dy, scale: 0.96 } : false}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      transition={{ duration: animated ? workspaceMotion.logoTile : 0, delay: animated ? index * workspaceMotion.logoStagger : 0, ease: workspaceMotion.ease }}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />)}
  </svg>;
}
