import React from 'react';
import { Link } from 'react-router-dom';
import { useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Language } from '../i18n';
import { InventoraLogoAnimation } from './InventoraLogoAnimation';
import { InventoraMark } from './InventoraMark';
import { HeroSection } from './ui/hero-section-2';
import './OpeningSequence.css';

interface OpeningSequenceProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

export function OpeningSequence({ lang, onLanguageChange }: OpeningSequenceProps) {
  const reduced = useReducedMotion();
  const en = lang === 'en';
  const reveal = !reduced;

  return <main className={`opening-workspace ${reveal ? 'is-revealing' : ''}`} lang={lang}>
    <HeroSection
      brand={<><InventoraMark size={30} /><span>Inventora</span></>}
      controls={<div className="opening-language" role="group" aria-label={en ? 'Language' : 'Bahasa'}>
        {(['en', 'id'] as const).map(language => <button key={language} type="button" lang={language}
          aria-label={language === 'en' ? 'English' : 'Bahasa Indonesia'} aria-pressed={lang === language}
          onClick={() => onLanguageChange(language)}>{language.toUpperCase()}</button>)}
      </div>}
      title={en ? <>Inventory.<br />Purchases.<br />Sales.</> : <>Persediaan.<br />Pembelian.<br />Penjualan.</>}
      subtitle={en ? 'Check stock, manage purchase orders, and record sales in Inventora.' : 'Periksa stok, kelola pesanan pembelian, dan catat penjualan di Inventora.'}
      callToAction={<>
        <Link to="/login" className="opening-enter">{en ? 'Open workspace' : 'Buka ruang kerja'}<ArrowRight size={18} aria-hidden="true" /></Link>
        <p className="opening-entry-note">{en ? 'Sign in with Google or try the demo.' : 'Masuk dengan Google atau coba demo.'}</p>
      </>}
      footer={<ul className="opening-modules" aria-label={en ? 'Workspace modules' : 'Modul ruang kerja'}>
        <li><strong>{en ? 'Stock & POS' : 'Stok & POS'}</strong><span>{en ? 'Inventory and checkout' : 'Persediaan dan kasir'}</span></li>
        <li><strong>{en ? 'Purchasing' : 'Pembelian'}</strong><span>{en ? 'Orders and receiving' : 'Pesanan dan penerimaan'}</span></li>
        <li><strong>{en ? 'Finance & HR' : 'Keuangan & SDM'}</strong><span>{en ? 'Invoices and payroll' : 'Faktur dan penggajian'}</span></li>
      </ul>}
      visual={<InventoraLogoAnimation reveal={reveal} />}
    />
  </main>;
}
