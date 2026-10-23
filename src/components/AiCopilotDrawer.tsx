import { authenticatedPost } from '../lib/apiClient';
import { apiErrorMessage } from '../lib/apiError';
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

const prompts = {
  en: [
    { label: 'Order summary', query: 'Summarize the available purchase order counts and recorded PO value. State which data is unavailable.' },
    { label: 'Stock to review', query: 'Explain the available stock metrics and which next steps I should check in the inventory module. Do not assume SKU-level data.' },
  ],
  id: [
    { label: 'Ringkasan PO', query: 'Ringkas jumlah PO dan nilai PO tercatat yang tersedia. Sebutkan data yang belum tersedia.' },
    { label: 'Tinjau stok', query: 'Jelaskan metrik stok yang tersedia dan langkah yang perlu diperiksa di modul inventori. Jangan mengasumsikan data per SKU.' },
  ],
};

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
        ? `Ask about the dashboard metrics available to your account. Detailed revenue, settlements, and payroll are not included in this conversation.`
        : `Tanyakan metrik dashboard yang tersedia bagi akunmu. Rincian pendapatan, pembayaran, dan payroll tidak disertakan dalam percakapan ini.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.open) dialog.showModal();
    if (!isOpen && dialog?.open) dialog.close();
  }, [isOpen]);

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

      const data = await authenticatedPost<{ reply: string }>('/api/copilot', {
        message: q, context: { ...erpContext, currentRole, lang }, history: historyPayload,
      });
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
          text: apiErrorMessage(err, lang),
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
    <dialog ref={dialogRef} className="ui-drawer" aria-labelledby="copilot-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right) onClose(); } }}>
      {isOpen && (<>
          {/* Drawer Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: .24, ease: [.2, .8, .2, 1] }}
            className="relative w-full bg-[var(--ws-surface)] h-full flex flex-col"
          >
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-[#161616]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#0864d9] flex items-center justify-center text-white shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 id="copilot-title" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <span>{lang === 'en' ? 'Inventora Assistant' : 'Asisten Inventora'}</span>

                  </h2>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    {lang === 'en' ? 'Ask about your workspace metrics' : 'Tanyakan metrik ruang kerjamu'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={lang === 'en' ? 'Close assistant' : 'Tutup asisten'}
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
                            className="opacity-60 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity ml-2 inline-flex items-center gap-1 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                            title={lang === 'en' ? 'Copy response' : 'Salin jawaban'}
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
                      {lang === 'en' ? 'Preparing a response…' : 'Menyiapkan jawaban…'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-4 py-2 bg-neutral-50/80 dark:bg-[#141414] border-t border-neutral-100 dark:border-neutral-800/80">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {prompts[lang].map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSend(qp.query)}
                    disabled={isLoading}
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
                  aria-label={lang === 'en' ? 'Message for assistant' : 'Pesan untuk asisten'}
                  placeholder={lang === 'en' ? 'Ask about your dashboard…' : 'Tanyakan tentang dashboard…'}
                  disabled={isLoading}
                  className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0070f3] text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
                />
                <button
                  aria-label={lang === 'en' ? 'Send message' : 'Kirim pesan'}
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
                  <span>{lang === 'en' ? 'Uses metrics available to this account' : 'Menggunakan metrik yang dapat diakses akun ini'}</span>
                </span>
                <span>{lang === 'en' ? 'Enter to send' : 'Enter untuk mengirim'}</span>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </dialog>
  );
}
