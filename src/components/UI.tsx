import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, ArrowUpDown, Download } from 'lucide-react';

export const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white dark:bg-[#111] p-6 rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.2)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_8px_16px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.12),0_8px_16px_rgba(0,0,0,0.4)] transition-shadow duration-300 ${className}`}>
    {children}
  </div>
);

export const Badge = ({ children, color = "blue" }: { children: React.ReactNode, color?: "blue" | "green" | "orange" | "gray" | "red" }) => {
  const colorMap = {
    blue: "bg-[#0070f3] dark:bg-[#3291ff]",
    green: "bg-[#10b981] dark:bg-[#34d399]",
    orange: "bg-[#f5a623] dark:bg-[#f5a623]",
    red: "bg-[#e00] dark:bg-[#f87171]",
    gray: "bg-[#999] dark:bg-[#888]"
  };
  return (
    <span className="shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] bg-white dark:bg-[#1a1a1a] px-2.5 py-0.5 rounded-full text-xs font-medium text-[#666] dark:text-[#a1a1aa] flex items-center gap-1.5 w-fit">
      <div className={`w-1.5 h-1.5 rounded-full ${colorMap[color]}`}></div>
      {children}
    </span>
  );
};

export const Button = ({ children, variant = "primary", onClick, type = "button", disabled = false, isLoading = false, className = "" }: { children: React.ReactNode, variant?: "primary" | "secondary", onClick?: () => void, type?: "button" | "submit", disabled?: boolean, isLoading?: boolean, className?: string }) => {
  const content = isLoading ? (
    <div className="flex items-center gap-2">
      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {children}
    </div>
  ) : children;

  if (variant === "primary") {
    return (
      <button type={type} onClick={onClick} disabled={disabled || isLoading} className={`bg-[#171717] dark:bg-[#ededed] text-white dark:text-[#171717] font-medium px-4 py-2 rounded-md text-sm hover:bg-[#383838] dark:hover:bg-[#ccc] transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.12)] disabled:opacity-80 disabled:cursor-not-allowed flex items-center justify-center min-h-[36px] ${className}`}>
        {content}
      </button>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled || isLoading} className={`bg-white dark:bg-[#111] text-[#171717] dark:text-[#ededed] font-medium shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.14)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.2)] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] px-3 py-1.5 rounded-md transition-shadow text-sm disabled:opacity-80 disabled:cursor-not-allowed flex items-center justify-center min-h-[32px] ${className}`}>
      {content}
    </button>
  );
};

export const TableWrapper = ({ title, placeholder, action, searchValue, onSearchChange, onExport, isExporting, currentPage, totalPages, onPageChange, children }: any) => (
  <div className="flex-1 bg-white dark:bg-[#111] rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] flex flex-col min-h-0">
    <div className="px-4 sm:px-6 py-3.5 sm:py-4 shadow-[0_1px_0_0_rgba(0,0,0,0.08)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08)] flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center justify-between bg-white dark:bg-[#111] rounded-t-xl z-10 shrink-0">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold tracking-tight text-sm sm:text-base text-[#171717] dark:text-[#ededed]">{title}</h2>
        <span className="sm:hidden text-[10px] text-neutral-400 font-mono">Swipe table &rarr;</span>
      </div>
      <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
        <input 
          type="text" 
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder} 
          className="bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] hover:shadow-[0_0_0_1px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.15)] focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)] dark:focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.4)] outline-none text-xs sm:text-sm px-3 py-1.5 rounded-md flex-1 sm:w-64 transition-shadow placeholder-[#999] dark:placeholder-[#666] text-[#171717] dark:text-[#ededed]" 
        />
        {onExport && (
          <Button variant="secondary" onClick={onExport} isLoading={isExporting}>
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" /> <span className="text-xs sm:text-sm">Export</span>
          </Button>
        )}
        {action}
      </div>
    </div>
    <div className="flex-1 overflow-x-auto overflow-y-auto overscroll-x-contain -webkit-overflow-scrolling-touch">
      <table className="w-full text-left border-collapse min-w-[700px] sm:min-w-[800px]">
        {children}
      </table>
    </div>
    {(currentPage && totalPages) && (
      <div className="px-4 sm:px-6 py-2.5 sm:py-3 shadow-[0_-1px_0_0_rgba(0,0,0,0.08)] dark:shadow-[0_-1px_0_0_rgba(255,255,255,0.08)] bg-[#fafafa] dark:bg-[#111] flex items-center justify-between rounded-b-xl shrink-0">
        <span className="text-xs sm:text-sm text-[#666] dark:text-[#a1a1aa]">
          Page <span className="font-medium text-[#171717] dark:text-[#ededed]">{currentPage}</span> of <span className="font-medium text-[#171717] dark:text-[#ededed]">{totalPages}</span>
        </span>
        <div className="flex gap-1.5 sm:gap-2">
          <Button variant="secondary" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
          <Button variant="secondary" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}>
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </div>
    )}
  </div>
);

export const Th = ({ children, align = "left", sortable, onSort }: { children: React.ReactNode, align?: "left" | "right", sortable?: boolean, onSort?: () => void }) => (
  <th 
    onClick={sortable ? onSort : undefined}
    className={`px-6 py-3 text-xs font-medium text-[#666] dark:text-[#a1a1aa] shadow-[0_1px_0_0_rgba(0,0,0,0.08)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.08)] bg-[#fafafa] dark:bg-[#0a0a0a] tracking-tight ${align === 'right' ? 'text-right' : ''} ${sortable ? 'cursor-pointer hover:bg-[#f0f0f0] dark:hover:bg-[#1a1a1a] transition-colors select-none' : ''}`}
  >
    <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : ''}`}>
      {children}
      {sortable && <ArrowUpDown className="w-3 h-3 opacity-50" />}
    </div>
  </th>
);

export const Td = ({ children, align = "left" }: { children: React.ReactNode, align?: "left" | "right" }) => (
  <td className={`px-6 py-4 text-sm text-[#171717] dark:text-[#ededed] shadow-[0_1px_0_0_rgba(0,0,0,0.04)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)] ${align === 'right' ? 'text-right' : ''}`}>
    {children}
  </td>
);

export const Tr = ({ children, index = 0 }: { children: React.ReactNode, index?: number, key?: any }) => (
  <motion.tr
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
    className="hover:bg-[#fafafa] dark:hover:bg-[#161616] transition-colors group"
  >
    {children}
  </motion.tr>
);

export const Modal = ({ isOpen, onClose, title, children }: any) => {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 dark:bg-black/40 backdrop-blur-sm p-4">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }} className="bg-white dark:bg-[#111] rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
          <div className="px-6 py-4 border-b border-[#eaeaea] dark:border-white/10 flex justify-between items-center bg-[#fafafa] dark:bg-[#0a0a0a]">
            <h3 className="font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">{title}</h3>
            <button onClick={onClose} className="text-[#999] hover:text-[#171717] dark:hover:text-[#ededed] transition-colors cursor-pointer">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div className="p-6 overflow-y-auto">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
