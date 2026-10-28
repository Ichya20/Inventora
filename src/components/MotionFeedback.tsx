import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { workspaceMotion } from '../lib/motion';

// Keep fields mounted; only the decorative highlight restarts when a value changes.
export function ChangeHighlight({ value, children, className = '' }: { value: string | number; children: React.ReactNode; className?: string }) {
  const previous = useRef(value);
  const [revision, setRevision] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!Object.is(previous.current, value)) {
      previous.current = value;
      setRevision(current => current + 1);
    }
  }, [value]);
  return <span className={`change-highlight ${className}`}>
    {revision > 0 && !reduced && <span key={revision} className="feedback-flash" aria-hidden="true" />}
    {children}
  </span>;
}

export function SuccessMark({ className = '' }: { className?: string }) {
  const reduced = useReducedMotion();
  return <span className={`success-mark ${className}`} aria-hidden="true">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <motion.path d="m5 12 4 4L19 6" initial={reduced ? false : { pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: reduced ? 0 : workspaceMotion.success, ease: workspaceMotion.ease }} />
    </svg>
  </span>;
}
