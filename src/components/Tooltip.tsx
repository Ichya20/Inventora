import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

type Props = { label: string; children: React.ReactNode };

export function Tooltip({ label, children }: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const cancelClose = () => { if (timer.current) clearTimeout(timer.current); };
  const show = () => { cancelClose(); setOpen(true); };
  const scheduleClose = () => {
    cancelClose();
    timer.current = setTimeout(() => {
      if (document.activeElement !== trigger.current && !panel.current?.matches(':hover')) setOpen(false);
    }, 140);
  };

  useEffect(() => () => cancelClose(), []);
  useLayoutEffect(() => {
    if (!open || !trigger.current || !panel.current) return;
    const anchor = trigger.current.getBoundingClientRect();
    const tip = panel.current.getBoundingClientRect();
    const left = Math.max(12, Math.min(anchor.left + anchor.width / 2 - tip.width / 2, window.innerWidth - tip.width - 12));
    const below = anchor.bottom + 8;
    const top = below + tip.height < window.innerHeight - 12 ? below : Math.max(12, anchor.top - tip.height - 8);
    setPosition({ left, top });
  }, [open, children]);

  useEffect(() => {
    if (!open) return;
    const dismiss = () => setOpen(false);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    const outside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) dismiss();
    };
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      document.removeEventListener('keydown', escape);
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [open]);

  return <>
    <button ref={trigger} type="button" className="info-trigger" aria-label={label}
      aria-describedby={open ? id : undefined} onPointerEnter={show} onPointerLeave={scheduleClose}
      onFocus={show} onBlur={scheduleClose} onClick={show}>
      <Info size={15} aria-hidden="true" />
    </button>
    {open && createPortal(
      <div ref={panel} id={id} role="tooltip" className="workspace-tooltip" style={position}
        onPointerEnter={cancelClose} onPointerLeave={scheduleClose}>{children}</div>,
      document.body,
    )}
  </>;
}
