import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { InventoraMark } from './InventoraMark';
import { workspaceMotion } from '../lib/motion';
import './InventoraBrand.css';

type Props = {
  compact?: boolean;
  reveal?: boolean;
  titleId?: string;
  description?: string;
};

export function InventoraBrand({ compact = false, reveal = false, titleId, description }: Props) {
  const reduced = useReducedMotion();
  const animated = reveal && !reduced;
  const Title = compact ? 'p' : 'h1';

  return <div className={`inventora-brand ${compact ? 'inventora-brand-compact' : ''}`}>
    <div className="inventora-brand-emblem">
      <motion.div className="inventora-brand-stage" initial={animated ? { rotateX: 5, rotateY: -4, y: -2 } : false}
        animate={{ rotateX: 0, rotateY: 0, y: 0 }}
        transition={{ duration: animated ? workspaceMotion.brandSettle : 0, ease: workspaceMotion.ease }}>
        <InventoraMark size={compact ? 64 : 112} reveal={animated} />
      </motion.div>
    </div>
    <motion.div className="inventora-brand-identity" initial={animated ? { opacity: 0, y: 4 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: animated ? workspaceMotion.brandName : 0, delay: animated ? workspaceMotion.brandNameDelay : 0, ease: workspaceMotion.ease }}>
      <Title id={titleId} className="inventora-brand-name">Inventora</Title>
      {description && <p className="inventora-brand-description">{description}</p>}
    </motion.div>
  </div>;
}
