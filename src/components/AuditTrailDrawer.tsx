import React, { useState, useMemo } from 'react';
import { ShieldCheck, Download, Search, History, CheckCircle2, AlertTriangle, ArrowRight, UserCheck, Lock } from 'lucide-react';
import { Modal, Badge } from './UI';

export interface AuditEvent {
  id: string;
  entityId: string;
  entityType: 'PO' | 'INVENTORY' | 'FINANCE' | 'HR' | 'PAYMENT';
  action: string;
  actor: string;
  actorEmail: string;
  role: string;
  timestamp: string;
  status: 'SUCCESS' | 'WARNING' | 'CRITICAL';
  details: string;
  hash: string;
}

const DEFAULT_AUDIT_LOGS: AuditEvent[] = [
  {
    id: 'AUD-99101',
    entityId: 'PO-2026-1039',
    entityType: 'PO',
    action: 'PO_STATUS_APPROVED',
    actor: 'Ichya Ulumiddin',
    actorEmail: 'ichyaulumiddin22@gmail.com',
    role: 'Super Admin',
    timestamp: '2026-09-22T05:22:10Z',
    status: 'SUCCESS',
    details: 'Approved Purchase Order for Lenovo Enterprise. Total: Rp 450.000.000 (PPN included).',
    hash: 'sha256-a94f83e20bb49c81bdf8018e',
  },
  {
    id: 'AUD-99088',
    entityId: 'TX-INVENTORA-8891',
    entityType: 'PAYMENT',
    action: 'PAYMENT_DISBURSED',
    actor: 'System Gateway',
    actorEmail: 'gateway@inventora.com',
    role: 'Automated Gateway',
    timestamp: '2026-09-22T05:24:45Z',
    status: 'SUCCESS',
    details: 'Verified BCA Virtual Account settlement: Rp 450.000.000.',
    hash: 'sha256-d71c49b01f98e82a3c75a40b',
  },
  {
    id: 'AUD-99042',
    entityId: 'PO-2026-1041',
    entityType: 'PO',
    action: 'PO_CREATED',
    actor: 'Budi Santoso',
    actorEmail: 'budi.s@inventora.com',
    role: 'Warehouse Lead',
    timestamp: '2026-09-21T18:14:02Z',
    status: 'SUCCESS',
    details: 'Drafted PO for 500 units Polychem Raw Pellets from PT Petrokimia Utama.',
    hash: 'sha256-c4193b2a8f09d31e99ba5512',
  },
  {
    id: 'AUD-99015',
    entityId: 'SKU-001',
    entityType: 'INVENTORY',
    action: 'STOCK_THRESHOLD_ALERT',
    actor: 'Inventory Watcher Bot',
    actorEmail: 'system@inventora.com',
    role: 'Automated Service',
    timestamp: '2026-09-21T14:02:11Z',
    status: 'WARNING',
    details: 'Stock for Ultra Precision Motor 12V fell below safety margin (15 units remaining).',
    hash: 'sha256-8e547fa00b392d4f55a9b71e',
  },
  {
    id: 'AUD-98990',
    entityId: 'EMP-10024',
    entityType: 'HR',
    action: 'SALARY_SLIP_ISSUED',
    actor: 'Siti Rahmawati',
    actorEmail: 'siti.r@inventora.com',
    role: 'Financial Controller',
    timestamp: '2026-09-20T09:00:00Z',
    status: 'SUCCESS',
    details: 'Generated biometric payroll statement for Budi Santoso (Engineering Dept).',
    hash: 'sha256-339fa8bc01d44ea19b88f3a0',
  }
];

interface AuditTrailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityFilter?: string | null;
  lang?: 'en' | 'id';
}

export function AuditTrailDrawer({
  isOpen,
  onClose,
  entityFilter,
  lang = 'en'
}: AuditTrailDrawerProps) {
  const [search, setSearch] = useState('');

  const logs = useMemo(() => {
    let list = DEFAULT_AUDIT_LOGS;
    if (entityFilter) {
      list = list.filter(item => item.entityId === entityFilter || item.details.includes(entityFilter));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(item => 
        item.action.toLowerCase().includes(q) ||
        item.actor.toLowerCase().includes(q) ||
        item.details.toLowerCase().includes(q) ||
        item.entityId.toLowerCase().includes(q)
      );
    }
    return list;
  }, [entityFilter, search]);

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `inventora-audit-${entityFilter || 'all'}-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        lang === 'en'
          ? `Enterprise Audit Trail ${entityFilter ? `(${entityFilter})` : ''}`
          : `Jejak Audit Enterprise ${entityFilter ? `(${entityFilter})` : ''}`
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'en' ? 'Search by actor, action or ID...' : 'Cari berdasarkan pelaku, aksi atau ID...'}
              className="w-full pl-8 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#0070f3]"
            />
          </div>
          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-all shrink-0 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>

        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-xs text-neutral-500">
              {lang === 'en' ? 'No audit entries match query' : 'Tidak ada entri audit yang cocok'}
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-[#151515] space-y-2 transition-all hover:border-neutral-300 dark:hover:border-neutral-700 shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 font-mono">
                      {log.entityId}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                      {log.action}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {log.details}
                </p>

                <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 pt-1.5 border-t border-neutral-100 dark:border-neutral-800/80">
                  <div className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{log.actor} ({log.role})</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[10px] text-neutral-400" title={log.hash}>
                    <Lock className="w-3 h-3 text-emerald-500" />
                    <span>{log.hash.substring(0, 14)}...</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg text-xs font-semibold cursor-pointer hover:bg-neutral-800 transition-all"
          >
            {lang === 'en' ? 'Close' : 'Tutup'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
