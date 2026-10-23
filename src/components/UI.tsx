import React, { createContext, useContext, useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, ArrowUpDown, Download, X, LoaderCircle } from 'lucide-react';
import type { Language } from '../types';

export const UILanguageContext = createContext<Language>('en');

export const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={`ui-card ${className}`}>{children}</div>;

export const Badge = ({ children, color = 'blue' }: { children: React.ReactNode; color?: 'blue' | 'green' | 'orange' | 'gray' | 'red' }) => {
  const colors = { blue: 'bg-blue-600', green: 'bg-emerald-600', orange: 'bg-amber-600', red: 'bg-rose-600', gray: 'bg-neutral-500' };
  return <span className="inline-flex items-center gap-1.5 w-fit px-2 py-1 rounded-md border border-[var(--ws-border)] text-[11px] font-medium text-[var(--ws-text)]"><span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${colors[color]}`}/>{children}</span>;
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary'; isLoading?: boolean };
export const Button = ({ children, variant = 'primary', isLoading = false, disabled, className = '', type = 'button', ...props }: ButtonProps) => <button {...props} type={type} disabled={disabled || isLoading} aria-busy={isLoading || undefined} className={`ui-button ui-button-${variant} ${className}`}>
  {isLoading && <LoaderCircle size={15} className="animate-spin" aria-hidden="true"/>}{children}
</button>;

export const TableWrapper = ({ title, placeholder, action, searchValue, onSearchChange, onExport, isExporting, currentPage, totalPages, onPageChange, children }: any) => {
  const en = useContext(UILanguageContext) === 'en';
  return <div className="ui-table-shell flex-1 flex flex-col min-h-0">
    <div className="ui-table-toolbar px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between shrink-0 rounded-t-[10px]">
      <div className="flex items-center justify-between gap-3"><h2 className="font-semibold tracking-tight text-sm text-[var(--ws-text)]">{title}</h2><span className="sm:hidden text-[10px] text-[var(--ws-muted)]">{en ? 'Scroll to view →' : 'Geser untuk melihat →'}</span></div>
      <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
        <input type="search" value={searchValue} onChange={event => onSearchChange(event.target.value)} placeholder={placeholder} aria-label={placeholder || (en ? 'Search records' : 'Cari data')} className="border border-[var(--ws-border)] bg-[var(--ws-surface)] text-[var(--ws-text)] placeholder:text-[var(--ws-muted)] text-xs px-3 py-2 rounded-md flex-1 min-w-0 sm:w-56 outline-none"/>
        {onExport && <Button variant="secondary" onClick={onExport} isLoading={isExporting}><Download size={14}/>{en ? 'Export' : 'Ekspor'}</Button>}{action}
      </div>
    </div>
    <div className="flex-1 overflow-auto overscroll-x-contain"><table className="w-full text-left border-collapse min-w-[700px]">{children}</table></div>
    {!!currentPage && !!totalPages && <div className="px-4 sm:px-6 py-3 border-t border-[var(--ws-border)] bg-[var(--ws-raised)] flex items-center justify-between rounded-b-[10px] shrink-0"><span className="text-xs text-[var(--ws-muted)]">{en ? 'Page' : 'Halaman'} <strong className="font-medium text-[var(--ws-text)]">{currentPage}</strong> {en ? 'of' : 'dari'} {totalPages}</span><div className="flex gap-2">
      <Button variant="secondary" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} aria-label={en ? 'Previous page' : 'Halaman sebelumnya'}><ChevronLeft size={15}/></Button>
      <Button variant="secondary" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} aria-label={en ? 'Next page' : 'Halaman berikutnya'}><ChevronRight size={15}/></Button>
    </div></div>}
  </div>;
};

export const Th = ({ children, align = 'left', sortable, onSort, sortDirection }: { children: React.ReactNode; align?: 'left' | 'right'; sortable?: boolean; onSort?: () => void; sortDirection?: 'ascending' | 'descending' }) => <th scope="col" aria-sort={sortable ? sortDirection ?? 'none' : undefined} className={`px-6 py-3 text-[11px] font-medium text-[var(--ws-muted)] border-b border-[var(--ws-border)] bg-[var(--ws-raised)] ${align === 'right' ? 'text-right' : ''}`}>
  {sortable ? <button type="button" onClick={onSort} className={`inline-flex items-center gap-1.5 cursor-pointer hover:text-[var(--ws-accent)] ${align === 'right' ? 'justify-end' : ''}`}>{children}<ArrowUpDown size={12} aria-hidden="true"/></button> : children}
</th>;
export const Td = ({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) => <td className={`px-6 py-4 text-xs text-[var(--ws-text)] border-b border-[var(--ws-border)] ${align === 'right' ? 'text-right tabular-nums' : ''}`}>{children}</td>;
// Rows stay still while users scan, sort, or paginate; the page handles entry motion.
export const Tr = ({ children }: { children: React.ReactNode; index?: number }) => <tr className="hover:bg-[var(--ws-raised)] transition-colors group">{children}</tr>;

type DialogProps = { isOpen: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode };

function Dialog({ isOpen, onClose, title, children, footer, variant = 'modal' }: DialogProps & { variant?: 'modal' | 'drawer' }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  const en = useContext(UILanguageContext) === 'en';
  useEffect(() => {
    const dialog = ref.current;
    if (isOpen && dialog && !dialog.open) dialog.showModal();
  }, [isOpen]);
  return <dialog ref={ref} className={variant === 'drawer' ? 'ui-drawer po-detail-drawer' : 'ui-dialog'} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) { const bounds = event.currentTarget.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose(); } }}>
    <AnimatePresence onExitComplete={() => { if (!isOpen) ref.current?.close(); }}>
    {isOpen && <motion.div key="dialog-content" initial={variant === 'drawer' ? { opacity: 0, x: 32 } : { opacity: 0, y: 6 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={variant === 'drawer' ? { opacity: 0, x: 32 } : { opacity: 0, y: 6 }} transition={{ duration: reduceMotion ? 0 : variant === 'drawer' ? .24 : .18, ease: [.2, .8, .2, 1] }} className="ui-dialog-content">
      <div className="ui-dialog-header"><h3 id={titleId}>{title}</h3><button type="button" onClick={onClose} aria-label={en ? 'Close dialog' : 'Tutup dialog'} title="Esc"><X size={18}/></button></div>
      <div className="dialog-body p-6 overflow-y-auto">{children}</div>
      {footer && <div className="dialog-footer">{footer}</div>}
    </motion.div>}
    </AnimatePresence>
  </dialog>;
}

export const Modal = (props: DialogProps) => <Dialog {...props} />;
export const Drawer = (props: DialogProps) => <Dialog {...props} variant="drawer" />;
