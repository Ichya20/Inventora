import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './UI';
import { translations, Language, Translations } from '../i18n';

interface PurchaseUnitViewProps {
  onNavigate: (menu: string) => void;
  t?: Translations;
  lang?: Language;
}

export function PurchaseUnitView({ onNavigate, t, lang = 'en' }: PurchaseUnitViewProps) {
  const activeT = t || translations[lang] || translations.en;
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep('success');
    }, 1000);
  };

  if (step === 'success') {
    return (
      <section className="p-4 md:p-8 flex-1 flex flex-col items-center justify-center overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white dark:bg-[#111] p-8 rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] text-center max-w-sm w-full"
        >
          <div className="w-12 h-12 rounded-full bg-[#10b981]/10 flex items-center justify-center text-[#10b981] mx-auto mb-4">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"></path></svg>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed] mb-2">
            {activeT.purchase.confirmedTitle}
          </h2>
          <p className="text-sm text-[#666] dark:text-[#a1a1aa] mb-6">
            {activeT.purchase.confirmedDesc} <span className="font-mono text-[#171717] dark:text-[#ededed] font-medium">PO-2026-1043</span>.
          </p>
          <Button onClick={() => onNavigate('po')} variant="secondary">
            {lang === 'en' ? 'Return to Procurement' : 'Kembali ke Pengadaan'}
          </Button>
        </motion.div>
      </section>
    );
  }

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col overflow-y-auto">
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <button 
          onClick={() => onNavigate('po')} 
          className="text-[#666] dark:text-[#a1a1aa] hover:text-[#171717] dark:hover:text-[#ededed] transition-colors shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] bg-white dark:bg-[#1a1a1a] w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#fafafa] dark:hover:bg-[#333] cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h2 className="text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">
          {activeT.purchase.title}
        </h2>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white dark:bg-[#111] rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] max-w-3xl flex-shrink-0"
      >
        <div className="px-6 py-4 shadow-[0_1px_0_0_rgba(0,0,0,0.08)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08)] bg-[#fafafa] dark:bg-[#1a1a1a] rounded-t-xl">
          <h3 className="font-medium tracking-tight text-[#171717] dark:text-[#ededed]">{activeT.purchase.formTitle}</h3>
          <p className="text-xs text-[#666] dark:text-[#a1a1aa] mt-0.5">{activeT.purchase.formDesc}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#171717] dark:text-[#ededed]">{activeT.purchase.vendorLabel}</label>
              <select required className="w-full bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.12)] focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)] outline-none text-sm px-3 py-2 rounded-md transition-shadow text-[#171717] dark:text-[#ededed] appearance-none cursor-pointer">
                <option value="">{activeT.purchase.selectVendor}</option>
                <option value="nvidia">NVIDIA Corp Indonesia</option>
                <option value="cisco">Cisco Systems Indonesia</option>
                <option value="dell">Dell EMC Indonesia</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#171717] dark:text-[#ededed]">{activeT.purchase.skuLabel}</label>
              <input required type="text" placeholder="e.g. NV-H100-TC" className="w-full bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.12)] focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)] outline-none text-sm px-3 py-2 rounded-md transition-shadow placeholder-[#999] dark:placeholder-[#666] text-[#171717] dark:text-[#ededed]" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#171717] dark:text-[#ededed]">{activeT.purchase.qtyLabel}</label>
              <input required type="number" min="1" placeholder="10" className="w-full bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.12)] focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)] outline-none text-sm px-3 py-2 rounded-md transition-shadow placeholder-[#999] dark:placeholder-[#666] text-[#171717] dark:text-[#ededed]" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[#171717] dark:text-[#ededed]">{activeT.purchase.priceLabel}</label>
              <input required type="text" placeholder="150,000,000" className="w-full bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.12)] focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)] outline-none text-sm px-3 py-2 rounded-md transition-shadow placeholder-[#999] dark:placeholder-[#666] text-[#171717] dark:text-[#ededed]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#171717] dark:text-[#ededed]">{activeT.purchase.notesLabel}</label>
            <textarea rows={3} placeholder={activeT.purchase.notesPlaceholder} className="w-full bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.12)] focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)] outline-none text-sm px-3 py-2 rounded-md transition-shadow placeholder-[#999] dark:placeholder-[#666] text-[#171717] dark:text-[#ededed] resize-none"></textarea>
          </div>
          
          <div className="pt-2 flex items-center justify-end gap-3">
            <Button onClick={() => onNavigate('po')} variant="secondary">
              {activeT.purchase.cancelBtn}
            </Button>
            <Button type="submit" disabled={isSubmitting} variant="primary">
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {activeT.purchase.processing}
                </div>
              ) : activeT.purchase.submitBtn}
            </Button>
          </div>
        </form>
      </motion.div>
    </section>
  );
}
export default PurchaseUnitView;
