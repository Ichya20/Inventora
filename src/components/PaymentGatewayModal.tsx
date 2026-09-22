import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ShieldCheck, Lock, CreditCard, Building2, QrCode, CheckCircle2, 
  Copy, Check, Printer, RefreshCw, BadgeCheck, Clock
} from 'lucide-react';
import { PurchaseOrder, PaymentTransaction } from '../types';
import { Language, Translations, translations as defaultTranslations } from '../i18n';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  po: PurchaseOrder | null;
  onPaymentSuccess: (transaction: PaymentTransaction) => void;
  lang?: Language;
  t?: Translations;
}

type PaymentMethodType = 'virtual_account' | 'credit_card' | 'bank_transfer' | 'qris';

export function PaymentGatewayModal({ 
  isOpen, 
  onClose, 
  po, 
  onPaymentSuccess, 
  lang = 'en', 
  t 
}: PaymentGatewayModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('virtual_account');
  const [selectedBank, setSelectedBank] = useState<'bca' | 'mandiri' | 'bni' | 'bri'>('bca');
  
  // Credit card state
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 9812');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvv, setCardCvv] = useState('884');
  const [cardHolder, setCardHolder] = useState('PT INVENTORA OPERASIONAL');
  
  // Wire transfer state
  const [treasuryAccount, setTreasuryAccount] = useState('BCA Corporate Operating (901-283-9912)');
  const [transferNotes, setTransferNotes] = useState('');

  // Processing & success states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(0);
  const [completedTx, setCompletedTx] = useState<PaymentTransaction | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [includeTax, setIncludeTax] = useState(true);

  const activeT = t || defaultTranslations[lang] || defaultTranslations.en;
  const numLocale = lang === 'en' ? 'en-US' : 'id-ID';

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setProcessStep(0);
      setCompletedTx(null);
      setCopiedText(null);
      if (po) {
        setTransferNotes(
          lang === 'en' 
            ? `Procurement Payment for ${po.id} - ${po.vendor}` 
            : `Pembayaran Pengadaan ${po.id} - ${po.vendor}`
        );
      }
    }
  }, [isOpen, po, lang]);

  if (!isOpen || !po) return null;

  const baseTotal = po.total || 0;
  // If include tax (11% PPN)
  const taxAmount = includeTax ? Math.round(baseTotal * 0.11) : 0;
  const grandTotal = baseTotal + taxAmount;

  const getVANumber = () => {
    switch (selectedBank) {
      case 'bca': return '8271 0029 ' + po.id.replace(/\D/g, '').padEnd(4, '0') + ' 991';
      case 'mandiri': return '8902 2189 ' + po.id.replace(/\D/g, '').padEnd(4, '0') + ' 504';
      case 'bni': return '9881 4452 ' + po.id.replace(/\D/g, '').padEnd(4, '0') + ' 213';
      case 'bri': return '1238 7719 ' + po.id.replace(/\D/g, '').padEnd(4, '0') + ' 778';
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text.replace(/\s+/g, ''));
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleProcessPayment = () => {
    setIsProcessing(true);
    setProcessStep(1);

    setTimeout(() => {
      setProcessStep(2);
    }, 700);

    setTimeout(() => {
      setProcessStep(3);
    }, 1400);

    setTimeout(() => {
      const txId = 'TX-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
      const receiptNumber = 'INV/PAY/' + new Date().getFullYear() + '/' + Math.floor(100000 + Math.random() * 900000);
      
      let methodLabel = '';
      let accountRef = '';
      if (selectedMethod === 'virtual_account') {
        methodLabel = `${selectedBank.toUpperCase()} Virtual Account`;
        accountRef = getVANumber();
      } else if (selectedMethod === 'credit_card') {
        methodLabel = lang === 'en' ? 'Corporate Credit Card' : 'Kartu Kredit Korporat';
        accountRef = cardNumber;
      } else if (selectedMethod === 'bank_transfer') {
        methodLabel = lang === 'en' ? 'Corporate Wire / RTGS' : 'Transfer Treasury / RTGS';
        accountRef = treasuryAccount;
      } else {
        methodLabel = lang === 'en' ? 'Dynamic B2B QRIS' : 'QRIS Dinamis Korporat';
        accountRef = 'NMID: ID10293847291';
      }

      const tx: PaymentTransaction = {
        id: txId,
        poId: po.id,
        vendor: po.vendor,
        amount: baseTotal,
        taxAmount: taxAmount,
        totalPaid: grandTotal,
        method: selectedMethod,
        methodLabel,
        accountReference: accountRef,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
        receiptNumber,
        notes: transferNotes || `Payment for ${po.id}`
      };

      setCompletedTx(tx);
      setIsProcessing(false);
      onPaymentSuccess(tx);
    }, 2200);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={!isProcessing ? onClose : undefined}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="relative w-full max-w-2xl bg-white dark:bg-[#121212] rounded-2xl shadow-2xl border border-[#eaeaea] dark:border-[#262626] overflow-hidden z-10 flex flex-col max-h-[92vh]"
        >
          {/* Top Banner & Security Header */}
          <div className="bg-[#171717] dark:bg-[#0a0a0a] text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-[#333]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold tracking-tight text-white">{activeT.gateway.modalTitle}</h2>
                  <span className="text-[10px] font-mono uppercase bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                    256-bit SSL
                  </span>
                </div>
                <p className="text-xs text-neutral-400">{activeT.gateway.secureSubtitle}</p>
              </div>
            </div>

            {!isProcessing && (
              <button 
                onClick={onClose}
                className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-neutral-800 transition-colors cursor-pointer"
                title={activeT.common.close}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {!completedTx ? (
              <>
                {/* PO Summary Card */}
                <div className="bg-[#fafafa] dark:bg-[#181818] p-4 rounded-xl border border-[#eaeaea] dark:border-[#262626] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eaeaea] dark:border-[#262626] pb-3">
                    <div>
                      <span className="text-[11px] font-mono text-[#888] uppercase block">{activeT.procurement.poNumber}</span>
                      <span className="font-mono font-semibold text-sm text-[#171717] dark:text-[#ededed]">{po.id}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-[#888] block">{activeT.procurement.vendor}</span>
                      <span className="font-semibold text-sm text-[#171717] dark:text-[#ededed]">{po.vendor}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-[#888]">{activeT.procurement.category}:</span>
                      <p className="font-medium text-[#171717] dark:text-[#ededed] truncate">{po.desc || (lang === 'en' ? 'Hardware Procurement' : 'Pengadaan Perangkat')}</p>
                    </div>
                    <div>
                      <span className="text-[#888]">{activeT.procurement.date}:</span>
                      <p className="font-medium text-[#171717] dark:text-[#ededed]">{po.date}</p>
                    </div>
                    <div>
                      <span className="text-[#888]">{activeT.common.status}:</span>
                      <p className="font-semibold text-amber-600 dark:text-amber-400">{po.status}</p>
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="bg-white dark:bg-[#1f1f1f] p-3 rounded-lg border border-[#eaeaea] dark:border-[#2e2e2e] space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#666] dark:text-[#aaa]">
                      <span>{activeT.gateway.baseSubtotal}:</span>
                      <span className="font-mono">Rp {baseTotal.toLocaleString(numLocale)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#666] dark:text-[#aaa]">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={includeTax} 
                          onChange={(e) => setIncludeTax(e.target.checked)}
                          className="rounded text-[#0070f3] focus:ring-0 w-3.5 h-3.5"
                        />
                        <span>{activeT.gateway.vatTax}:</span>
                      </label>
                      <span className="font-mono">Rp {taxAmount.toLocaleString(numLocale)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-semibold text-[#171717] dark:text-[#ededed] pt-2 border-t border-[#eaeaea] dark:border-[#333]">
                      <span>{activeT.gateway.grandTotal}:</span>
                      <span className="text-base text-[#0070f3] dark:text-[#3291ff] font-mono">
                        Rp {grandTotal.toLocaleString(numLocale)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="text-xs font-semibold text-[#171717] dark:text-[#ededed] uppercase tracking-wider block mb-2.5">
                    {activeT.gateway.selectChannel}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'virtual_account', label: activeT.gateway.vaTab, icon: Building2, desc: 'BCA / Mandiri / BNI' },
                      { id: 'credit_card', label: activeT.gateway.cardTab, icon: CreditCard, desc: 'Visa / Mastercard' },
                      { id: 'bank_transfer', label: activeT.gateway.wireTab, icon: Lock, desc: 'RTGS / BI-FAST' },
                      { id: 'qris', label: activeT.gateway.qrisTab, icon: QrCode, desc: 'Instant Dynamic' },
                    ].map(method => {
                      const Icon = method.icon;
                      const isSelected = selectedMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setSelectedMethod(method.id as PaymentMethodType)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between h-20 ${
                            isSelected 
                              ? 'bg-blue-50/50 dark:bg-blue-950/20 border-[#0070f3] dark:border-[#3291ff] shadow-[0_0_0_1px_#0070f3]' 
                              : 'bg-white dark:bg-[#1a1a1a] border-[#eaeaea] dark:border-[#2a2a2a] hover:border-[#ccc] dark:hover:border-[#444]'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-[#0070f3] dark:text-[#3291ff]' : 'text-[#888]'}`} />
                            {isSelected && <BadgeCheck className="w-3.5 h-3.5 text-[#0070f3] dark:text-[#3291ff]" />}
                          </div>
                          <div>
                            <div className={`text-xs font-semibold ${isSelected ? 'text-[#0070f3] dark:text-[#3291ff]' : 'text-[#171717] dark:text-[#ededed]'}`}>
                              {method.label}
                            </div>
                            <div className="text-[10px] text-[#888] truncate">{method.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Method Specific Details Form */}
                <div className="bg-[#fafafa] dark:bg-[#171717] p-4 rounded-xl border border-[#eaeaea] dark:border-[#262626]">
                  {selectedMethod === 'virtual_account' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#666] dark:text-[#aaa]">
                          {lang === 'en' ? 'Select Issuing Bank:' : 'Pilih Bank Penerbit:'}
                        </span>
                        <div className="flex gap-1.5">
                          {(['bca', 'mandiri', 'bni', 'bri'] as const).map(bank => (
                            <button
                              key={bank}
                              type="button"
                              onClick={() => setSelectedBank(bank)}
                              className={`px-2.5 py-1 text-xs font-mono uppercase font-semibold rounded-md border transition-all cursor-pointer ${
                                selectedBank === bank
                                  ? 'bg-[#171717] text-white border-[#171717] dark:bg-white dark:text-black dark:border-white shadow-sm'
                                  : 'bg-white dark:bg-[#222] text-[#666] dark:text-[#aaa] border-[#eaeaea] dark:border-[#333]'
                              }`}
                            >
                              {bank}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-white dark:bg-[#1f1f1f] rounded-lg border border-[#eaeaea] dark:border-[#2f2f2f]">
                        <span className="text-[11px] text-[#888] block mb-1">{activeT.gateway.vaNumberLabel}:</span>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-base font-semibold text-[#171717] dark:text-[#ededed] tracking-wider">
                            {getVANumber()}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(getVANumber(), 'va')}
                            className="flex items-center gap-1 text-xs text-[#0070f3] dark:text-[#3291ff] hover:underline font-medium px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/40 cursor-pointer"
                          >
                            {copiedText === 'va' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedText === 'va' ? activeT.common.copied : activeT.common.copy}
                          </button>
                        </div>
                        <div className="mt-2 pt-2 border-t border-[#f0f0f0] dark:border-[#2a2a2a] text-[11px] text-[#666] dark:text-[#999] flex items-center justify-between">
                          <span>{activeT.gateway.accountHolder}: <strong>PT {po.vendor.toUpperCase()}</strong></span>
                          <span>Auto-Settlement 24/7</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedMethod === 'credit_card' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] text-[#666] dark:text-[#aaa] block mb-1">{activeT.gateway.cardNumLabel}</label>
                        <div className="relative">
                          <input 
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            className="w-full text-xs font-mono bg-white dark:bg-[#1f1f1f] border border-[#eaeaea] dark:border-[#333] rounded-md px-3 py-2 outline-none focus:border-[#0070f3] text-[#171717] dark:text-[#ededed]"
                            placeholder="4000 1234 5678 9010"
                          />
                          <CreditCard className="w-4 h-4 text-[#888] absolute right-3 top-2.5" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-[#666] dark:text-[#aaa] block mb-1">{activeT.gateway.cardExpiryLabel} (MM/YY)</label>
                          <input 
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="w-full text-xs font-mono bg-white dark:bg-[#1f1f1f] border border-[#eaeaea] dark:border-[#333] rounded-md px-3 py-2 outline-none focus:border-[#0070f3] text-[#171717] dark:text-[#ededed]"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-[#666] dark:text-[#aaa] block mb-1">{activeT.gateway.cardCvvLabel} (3 Digit)</label>
                          <input 
                            type="password"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            maxLength={4}
                            className="w-full text-xs font-mono bg-white dark:bg-[#1f1f1f] border border-[#eaeaea] dark:border-[#333] rounded-md px-3 py-2 outline-none focus:border-[#0070f3] text-[#171717] dark:text-[#ededed]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-[#666] dark:text-[#aaa] block mb-1">{activeT.gateway.cardHolderLabel}</label>
                        <input 
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          className="w-full text-xs bg-white dark:bg-[#1f1f1f] border border-[#eaeaea] dark:border-[#333] rounded-md px-3 py-2 outline-none focus:border-[#0070f3] text-[#171717] dark:text-[#ededed]"
                        />
                      </div>
                    </div>
                  )}

                  {selectedMethod === 'bank_transfer' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] text-[#666] dark:text-[#aaa] block mb-1">{activeT.gateway.wireSourceLabel}</label>
                        <select
                          value={treasuryAccount}
                          onChange={(e) => setTreasuryAccount(e.target.value)}
                          className="w-full text-xs bg-white dark:bg-[#1f1f1f] border border-[#eaeaea] dark:border-[#333] rounded-md px-3 py-2 outline-none focus:border-[#0070f3] text-[#171717] dark:text-[#ededed]"
                        >
                          <option value="BCA Corporate Operating (901-283-9912)">BCA Corporate Operating (901-283-9912) - {lang === 'en' ? 'Balance' : 'Saldo'}: Rp 45.2M</option>
                          <option value="Mandiri Cash Management (120-00-1928371-2)">Mandiri Cash Management (120-00-1928371-2) - {lang === 'en' ? 'Balance' : 'Saldo'}: Rp 31.8M</option>
                          <option value="BNI Corporate Direct (029-192-8821)">BNI Corporate Direct (029-192-8821) - {lang === 'en' ? 'Balance' : 'Saldo'}: Rp 18.5M</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] text-[#666] dark:text-[#aaa] block mb-1">{activeT.gateway.wireNotesLabel}</label>
                        <input 
                          type="text"
                          value={transferNotes}
                          onChange={(e) => setTransferNotes(e.target.value)}
                          className="w-full text-xs bg-white dark:bg-[#1f1f1f] border border-[#eaeaea] dark:border-[#333] rounded-md px-3 py-2 outline-none focus:border-[#0070f3] text-[#171717] dark:text-[#ededed]"
                          placeholder={lang === 'en' ? 'Vendor procurement settlement memo' : 'Keterangan pengadaan vendor'}
                        />
                      </div>

                      <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-900/50 flex items-center gap-2 text-[11px] text-blue-900 dark:text-blue-300">
                        <Lock className="w-3.5 h-3.5 shrink-0 text-[#0070f3]" />
                        <span>
                          {lang === 'en' 
                            ? 'Disbursement executed automatically with corporate multi-signature authorization.' 
                            : 'Disbursement dijalankan secara otomatis dengan validasi multi-signature korporat.'}
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedMethod === 'qris' && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                      <div className="w-28 h-28 bg-white p-2 rounded-lg border border-[#eaeaea] dark:border-[#333] shadow-sm flex items-center justify-center shrink-0">
                        <div className="w-full h-full border-2 border-black flex flex-col items-center justify-center p-1 bg-white">
                          <QrCode className="w-16 h-16 text-black" />
                          <span className="text-[8px] font-bold text-black uppercase mt-0.5">QRIS STANDAR B2B</span>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                          <span className="font-semibold text-[#171717] dark:text-[#ededed]">QRIS Dynamic Corporate</span>
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium">
                            {lang === 'en' ? 'Active' : 'Aktif'}
                          </span>
                        </div>
                        <p className="text-[#666] dark:text-[#aaa] text-[11px]">
                          {activeT.gateway.qrisScanPrompt}
                        </p>
                        <div className="text-[11px] font-mono text-[#888] flex items-center gap-1 justify-center sm:justify-start">
                          <Clock className="w-3 h-3 text-amber-500" /> 
                          {lang === 'en' ? 'Expires in: 14m 45s' : 'Kadaluarsa dalam: 14 menit 45 detik'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Security Advisory */}
                <div className="flex items-center justify-between text-[11px] text-[#666] dark:text-[#888] px-1">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-600" /> 
                    {lang === 'en' ? 'Protected by encrypted interbank handshake' : 'Transaksi dilindungi verifikasi perbankan terenkripsi'}
                  </span>
                  <span>{lang === 'en' ? 'Authorization' : 'Otorisasi'}: {po.status}</span>
                </div>
              </>
            ) : (
              /* Receipt & Confirmation View */
              <div className="py-2 space-y-5">
                <div className="text-center space-y-1.5">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-300 dark:border-emerald-800">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-[#171717] dark:text-[#ededed]">{activeT.gateway.successTitle}</h3>
                  <p className="text-xs text-[#666] dark:text-[#aaa]">
                    {lang === 'en' ? (
                      <>Procurement funds of <strong className="text-[#171717] dark:text-white font-mono">Rp {completedTx.totalPaid.toLocaleString(numLocale)}</strong> have been settled to vendor.</>
                    ) : (
                      <>Dana pengadaan sebesar <strong className="text-[#171717] dark:text-white font-mono">Rp {completedTx.totalPaid.toLocaleString(numLocale)}</strong> telah disalurkan ke vendor.</>
                    )}
                  </p>
                </div>

                {/* Printable Official Receipt */}
                <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-xl border border-[#eaeaea] dark:border-[#2e2e2e] shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-[#eaeaea] dark:border-[#2e2e2e] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-[#171717] text-white flex items-center justify-center text-xs font-bold">
                        I
                      </div>
                      <span className="font-bold text-sm text-[#171717] dark:text-[#ededed]">Inventora Enterprise Settlement</span>
                    </div>
                    <span className="text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold border border-emerald-200 dark:border-emerald-900">
                      SETTLED
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[#888] block text-[10px]">{lang === 'en' ? 'RECEIPT / VOUCHER NO.' : 'NO. RECEIPT / BUKTI'}</span>
                      <span className="font-mono font-semibold text-[#171717] dark:text-[#ededed]">{completedTx.receiptNumber}</span>
                    </div>
                    <div>
                      <span className="text-[#888] block text-[10px]">{activeT.gateway.txIdLabel}</span>
                      <span className="font-mono font-semibold text-[#171717] dark:text-[#ededed]">{completedTx.id}</span>
                    </div>
                    <div>
                      <span className="text-[#888] block text-[10px]">{activeT.procurement.poNumber}</span>
                      <span className="font-mono font-semibold text-[#171717] dark:text-[#ededed]">{completedTx.poId}</span>
                    </div>
                    <div>
                      <span className="text-[#888] block text-[10px]">{activeT.gateway.timestampLabel}</span>
                      <span className="text-[#171717] dark:text-[#ededed] font-medium">{new Date(completedTx.timestamp).toLocaleString(numLocale)}</span>
                    </div>
                    <div>
                      <span className="text-[#888] block text-[10px]">{activeT.procurement.vendor}</span>
                      <span className="font-semibold text-[#171717] dark:text-[#ededed]">{completedTx.vendor}</span>
                    </div>
                    <div>
                      <span className="text-[#888] block text-[10px]">{activeT.procurement.paymentChannels}</span>
                      <span className="text-[#171717] dark:text-[#ededed] font-medium">{completedTx.methodLabel}</span>
                    </div>
                  </div>

                  <div className="bg-[#fafafa] dark:bg-[#141414] p-3 rounded-lg border border-[#eaeaea] dark:border-[#262626] space-y-1 text-xs">
                    <div className="flex justify-between text-[#666] dark:text-[#aaa]">
                      <span>{activeT.gateway.baseSubtotal}:</span>
                      <span className="font-mono">Rp {completedTx.amount.toLocaleString(numLocale)}</span>
                    </div>
                    <div className="flex justify-between text-[#666] dark:text-[#aaa]">
                      <span>PPN 11%:</span>
                      <span className="font-mono">Rp {completedTx.taxAmount.toLocaleString(numLocale)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-[#171717] dark:text-white pt-1.5 border-t border-[#eaeaea] dark:border-[#333]">
                      <span>{lang === 'en' ? 'Total Settled:' : 'Total Telah Dibayar:'}</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        Rp {completedTx.totalPaid.toLocaleString(numLocale)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#888] pt-1">
                    <span>
                      {lang === 'en' ? 'PO Status Updated: ' : 'Status PO Diperbarui: '}
                      <strong>{lang === 'en' ? 'Settled (Paid)' : 'Selesai (Paid)'}</strong>
                    </span>
                    <button 
                      type="button" 
                      onClick={handlePrintReceipt}
                      className="flex items-center gap-1 text-[#0070f3] dark:text-[#3291ff] hover:underline font-medium cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> {activeT.gateway.printBtn}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
                  <BadgeCheck className="w-4 h-4 text-[#0070f3] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">
                      {lang === 'en' ? 'Transaction Notification Broadcasted' : 'Notifikasi Transaksi Terkirim'}
                    </span>
                    <span>
                      {lang === 'en' 
                        ? 'Real-time notification automatically dispatched to Notification Center and finance audit log.' 
                        : 'Notifikasi real-time otomatis disiarkan ke Pusat Notifikasi dan email divisi akuntansi.'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-[#fafafa] dark:bg-[#141414] border-t border-[#eaeaea] dark:border-[#262626] flex items-center justify-between shrink-0">
            {!completedTx ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isProcessing}
                  className="px-4 py-2 text-xs font-medium text-[#666] dark:text-[#aaa] hover:text-[#171717] dark:hover:text-white transition-colors cursor-pointer"
                >
                  {activeT.common.cancel}
                </button>

                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <span className="text-[10px] text-[#888] uppercase block">
                      {lang === 'en' ? 'Total Payable' : 'Total Bayar'}
                    </span>
                    <span className="text-sm font-bold font-mono text-[#171717] dark:text-[#ededed]">
                      Rp {grandTotal.toLocaleString(numLocale)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleProcessPayment}
                    disabled={isProcessing}
                    className="bg-[#0070f3] hover:bg-[#0060df] text-white font-medium text-xs px-5 py-2.5 rounded-lg shadow-sm hover:shadow flex items-center gap-2 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>
                          {processStep === 1 && (lang === 'en' ? 'Connecting to Bank...' : 'Menghubungi Bank...')}
                          {processStep === 2 && (lang === 'en' ? 'Validating Signature...' : 'Memvalidasi Signature...')}
                          {processStep === 3 && (lang === 'en' ? 'Confirming Settlement...' : 'Mengonfirmasi Settlement...')}
                        </span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>{activeT.gateway.simulateBtn}</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto bg-[#171717] hover:bg-[#2b2b2b] dark:bg-white dark:hover:bg-[#eaeaea] text-white dark:text-black font-medium text-xs px-6 py-2.5 rounded-lg transition-all cursor-pointer"
                >
                  {activeT.gateway.closeBtn}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
