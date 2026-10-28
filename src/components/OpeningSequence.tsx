import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Pause, Play } from 'lucide-react';
import { Language } from '../i18n';
import { InventoraLogoAnimation } from './InventoraLogoAnimation';
import { workspaceMotion } from '../lib/motion';
import './OpeningSequence.css';

interface OpeningSequenceProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

export function OpeningSequence({ lang, onLanguageChange }: OpeningSequenceProps) {
  const reduced = useReducedMotion();
  const en = lang === 'en';
  const [paused, setPaused] = useState(false);
  const reveal = !reduced;
  const motionLabel = paused
    ? (en ? 'Resume logo animation' : 'Lanjutkan animasi logo')
    : (en ? 'Pause logo animation' : 'Jeda animasi logo');

  return <main className={`opening-workspace ${reveal ? 'is-revealing' : ''}`}>
    <div className="opening-visual">
      <InventoraLogoAnimation reveal={reveal} paused={paused} />
      {!reduced && <button type="button" className="opening-motion-toggle" aria-label={motionLabel} title={motionLabel}
        onClick={() => setPaused(value => !value)}>
        {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
      </button>}
    </div>
    <header className="opening-topbar">
      <div className="opening-language" role="group" aria-label={en ? 'Language' : 'Bahasa'}>
        {(['id', 'en'] as const).map(language => <button key={language} type="button" aria-pressed={lang === language} onClick={() => onLanguageChange(language)}>{language.toUpperCase()}</button>)}
      </div>
    </header>

    <section className="opening-center" aria-labelledby="opening-title">
      <div className="opening-content">
        <motion.div initial={reveal ? { opacity: 0, y: 6 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reveal ? workspaceMotion.brandName : 0, ease: workspaceMotion.ease }}>
          <h1 id="opening-title">Inventora</h1>
          <p className="opening-description">{en ? 'Inventory, procurement, and sales.' : 'Persediaan, pengadaan, dan penjualan.'}</p>
        </motion.div>
        <div className="opening-actions">
          <Link to="/login" className="opening-enter">{en ? 'Open workspace' : 'Buka ruang kerja'}<ArrowRight size={18} aria-hidden="true" /></Link>
        </div>
      </div>
    </section>
  </main>;
}
