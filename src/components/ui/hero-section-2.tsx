import React, { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { workspaceMotion } from '../../lib/motion';

interface HeroSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  brand: React.ReactNode;
  title: React.ReactNode;
  subtitle: string;
  callToAction: React.ReactNode;
  visual: React.ReactNode;
  controls?: React.ReactNode;
  footer?: React.ReactNode;
}

const HeroSection = React.forwardRef<HTMLElement, HeroSectionProps>(function HeroSection({
  brand, title, subtitle, callToAction, visual, controls, footer, className = '', ...props
}, ref) {
  const titleId = useId();
  const reduced = useReducedMotion();
  return <section ref={ref} className={`inventora-hero ${className}`} aria-labelledby={titleId} {...props}>
    <header className="hero-topbar">
      <div className="hero-brand">{brand}</div>
      {controls}
    </header>
    <div className="hero-content">
      <motion.div initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0 : workspaceMotion.brandSettle, ease: workspaceMotion.ease }}>
        <h1 id={titleId}>{title}</h1>
        <p className="hero-description">{subtitle}</p>
      </motion.div>
      <div className="hero-actions">{callToAction}</div>
    </div>
    {footer && <footer className="hero-footer">{footer}</footer>}
    <div className="hero-visual">
      <motion.div className="hero-visual-field" aria-hidden="true"
        initial={reduced ? false : { opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduced ? 0 : workspaceMotion.brandSettle, ease: workspaceMotion.ease }} />
      <div className="hero-visual-content">{visual}</div>
    </div>
  </section>;
});

export { HeroSection };
export type { HeroSectionProps };
