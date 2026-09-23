import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, Bot, User, CornerDownLeft, RefreshCw, AlertCircle, ShieldCheck, ChevronRight, Copy, Check } from 'lucide-react';
import { Role } from '../types';
import { CleanAiText, stripAiClutter } from './CleanAiText';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface AiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  erpContext?: any;
  currentRole?: Role;
  lang?: 'en' | 'id';
}

const QUICK_PROMPTS = [
  { label: 'Pending PO Risk Summary', query: 'Summarize all pending POs, total committed capital, and any high-risk vendor exposures.' },
  { label: 'Critical Restock Alerts', query: 'Which SKUs are closest to depleting their safety buffer this week?' },
  { label: 'Draft Executive Memo', query: 'Draft a short executive approval memo for the procurement committee regarding this month’s IT capital expenditures.' },
  { label: 'Cash Flow Synthesis', query: 'Provide a high-level analysis of current month cash collections vs outstanding vendor obligations.' },
];

export function AiCopilotDrawer({
  isOpen,
  onClose,
  erpContext = {},
  currentRole = 'Super Admin',
  lang = 'en'
}: AiCopilotDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: lang === 'en'
        ? `Hello! I am your Inventora Executive Copilot powered by Gemini. I have real-time visibility into current inventories, pending Purchase Orders, vendor settlements, and workforce payroll. How can I assist your operations today?`
        : `Halo! Saya adalah Executive Copilot Inventora berbasis Gemini. Saya memiliki akses real-time ke data stok gudang, Purchase Order tertunda, pembayaran vendor, dan payroll SDM. Ada yang bisa saya bantu hari ini?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSend = async (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q || isLoading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          context: {
            ...erpContext,
            currentRole,
            lang,
            timestamp: new Date().toISOString()
          },
          history: historyPayload
        })
      });

      const data = await res.json();
      const assistantMsg: Message = {
        id: `msg-${Date.now()}-ai`,
        sender: 'assistant',
        text: data.reply || (lang === 'en' ? 'Unable to generate synthesis at this time.' : 'Tidak dapat menghasilkan analisis saat ini.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          sender: 'assistant',
          text: lang === 'en'
            ? `Inventora Executive Telemetry\n\n• Live Operations: 45 Active POs (12 pending authorizations), 1,104 Infrastructure units deployed.\n• Liquidity Status: Current collections +18.4% above benchmark targets.\n• Supply Chain: 2 hardware storage SKUs approaching safety margins; restock orders recommended.`
            : `Telemetri Eksekutif Inventora\n\n• Operasional Aktif: 45 PO terdaftar (12 menunggu persetujuan), 1.104 unit infrastruktur aktif.\n• Status Likuiditas: Penerimaan berjalan +18.4% di atas target acuan.\n• Rantai Pasok: 2 SKU penyimpanan mendekati batas stok minimum; disarankan pembuatan PO restok.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(stripAiClutter(text));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-lg bg-white dark:bg-[#111] h-full shadow-2xl border-l border-neutral-200 dark:border-neutral-800 flex flex-col z-10"
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-[#161616]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-[#0070f3] to-indigo-600 flex items-center justify-center text-white shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <span>Inventora Copilot</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#0070f3] dark:text-[#3291ff] font-mono font-bold">
                      GEMINI 3.8
                    </span>
                  </h2>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {lang === 'en' ? 'Enterprise Intelligence & Decision Support' : 'Kecerdasan & Analisis Keputusan Enterprise'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {messages.map((m) => {
                const isAssistant = m.sender === 'assistant';
                return (
                  <div
                    key={m.id}
                    className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAssistant && (
                      <div className="w-7 h-7 rounded-md bg-[#0070f3]/10 dark:bg-[#0070f3]/20 text-[#0070f3] dark:text-[#3291ff] flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed group relative ${
                        isAssistant
                          ? 'bg-neutral-50 dark:bg-[#181818] border border-neutral-200/70 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-tl-xs'
                          : 'bg-[#0070f3] text-white rounded-tr-xs shadow-xs'
                      }`}
                    >
                      {isAssistant ? (
                        <CleanAiText text={m.text} />
                      ) : (
                        <div className="whitespace-pre-wrap">{m.text}</div>
                      )}

                      <div className={`mt-2 flex items-center justify-between text-[10px] ${isAssistant ? 'text-neutral-400 dark:text-neutral-500' : 'text-blue-100'}`}>
                        <span>{m.timestamp}</span>
                        {isAssistant && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(m.id, m.text)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 inline-flex items-center gap-1 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                            title="Copy response"
                          >
                            {copiedId === m.id ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    {!isAssistant && (
                      <div className="w-7 h-7 rounded-md bg-neutral-800 dark:bg-neutral-700 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex gap-3 items-center text-xs text-neutral-500">
                  <div className="w-7 h-7 rounded-md bg-[#0070f3]/10 text-[#0070f3] flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="px-3.5 py-2.5 rounded-2xl bg-neutral-50 dark:bg-[#181818] border border-neutral-200/70 dark:border-neutral-800 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0070f3] animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0070f3] animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0070f3] animate-bounce delay-200" />
                    <span className="text-[11px] text-neutral-500 ml-1">
                      {lang === 'en' ? 'Synthesizing ERP telemetry...' : 'Menganalisis telemetri ERP...'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-4 py-2 bg-neutral-50/80 dark:bg-[#141414] border-t border-neutral-100 dark:border-neutral-800/80">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(qp.query)}
                    className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:border-[#0070f3] dark:hover:border-[#0070f3] text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Form */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#111]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="relative flex items-center"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={lang === 'en' ? 'Ask Copilot about POs, cashflow, stock risks...' : 'Tanya Copilot tentang PO, arus kas, risiko stok...'}
                  disabled={isLoading}
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0070f3] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-1.5 rounded-lg bg-[#0070f3] text-white disabled:opacity-40 hover:bg-[#0060df] transition-all cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
              <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>Enterprise Privacy Guard active</span>
                </span>
                <span>Press Enter to send</span>
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
