import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BarChart3, CreditCard, Database, FileText, LayoutDashboard, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Receipt, Settings, ShoppingCart, Sun, Users, X } from 'lucide-react';
import { InventoraMark } from '../InventoraMark';
import { canAccessMenu } from '../../lib/authorization';
import type { Language, Translations } from '../../i18n';
import type { Role } from '../../types';

export interface WorkspaceSidebarProps {
  activeMenu: string;
  role: Role;
  language: Language;
  labels: Translations['nav'];
  account: { displayName?: string | null; email?: string | null };
  isDemo: boolean;
  pendingApprovalsCount: number;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  onNavigate: (menu: string) => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export function WorkspaceSidebar({ activeMenu, role, language, labels, account, isDemo, pendingApprovalsCount, mobileOpen, onMobileOpenChange, onNavigate, onToggleTheme, onLogout }: WorkspaceSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [tooltip, setTooltip] = useState<{ label: string; left: number; top: number } | null>(null);
  const sidebar = useRef<HTMLElement>(null);
  const tooltipTrigger = useRef<HTMLButtonElement>(null);
  const tooltipPanel = useRef<HTMLDivElement>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const en = language === 'en';
  const closeLabel = en ? 'Close navigation' : 'Tutup navigasi';
  const collapseLabel = collapsed ? (en ? 'Expand sidebar' : 'Perluas sidebar') : (en ? 'Collapse sidebar' : 'Ciutkan sidebar');
  const themeLabel = en ? 'Toggle color theme' : 'Ganti tema warna';
  const email = account.email || '—';
  const name = account.displayName || account.email || (en ? 'Account' : 'Akun');
  const initials = name.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  const cancelTooltipClose = () => { if (tooltipTimer.current) clearTimeout(tooltipTimer.current); };
  const scheduleTooltipClose = () => {
    cancelTooltipClose();
    tooltipTimer.current = setTimeout(() => {
      if (document.activeElement !== tooltipTrigger.current && !tooltipPanel.current?.matches(':hover')) setTooltip(null);
    }, 140);
  };
  useEffect(() => () => cancelTooltipClose(), []);

  useEffect(() => {
    if (!mobileOpen) return;
    const mobile = window.matchMedia('(max-width: 767px)');
    if (!mobile.matches) { onMobileOpenChange(false); return; }
    const main = document.getElementById('workspace-content');
    const previous = document.activeElement as HTMLElement | null;
    const wasInert = main?.inert ?? false;
    if (main) main.inert = true;
    const controls = () => Array.from(sidebar.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]') ?? []).filter(element => element.getClientRects().length > 0);
    controls()[0]?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onMobileOpenChange(false); return; }
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    const handleResize = () => { if (!mobile.matches) onMobileOpenChange(false); };
    document.addEventListener('keydown', handleKey);
    mobile.addEventListener('change', handleResize);
    return () => {
      if (main) main.inert = wasInert;
      document.removeEventListener('keydown', handleKey);
      mobile.removeEventListener('change', handleResize);
      previous?.focus();
    };
  }, [mobileOpen, onMobileOpenChange]);

  useEffect(() => {
    if (!tooltip) return;
    const dismiss = () => { cancelTooltipClose(); setTooltip(null); };
    const handleKey = (event: KeyboardEvent) => { if (event.key === 'Escape') dismiss(); };
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [tooltip]);

  const revealLabel = (event: React.FocusEvent<HTMLButtonElement> | React.PointerEvent<HTMLButtonElement>, label: string) => {
    if (!collapsed || !window.matchMedia('(min-width: 768px)').matches) return;
    cancelTooltipClose();
    tooltipTrigger.current = event.currentTarget;
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({ label, left: rect.right + 12, top: rect.top + rect.height / 2 });
  };
  const tooltipEvents = (label: string) => ({
    onFocus: (event: React.FocusEvent<HTMLButtonElement>) => revealLabel(event, label),
    onBlur: scheduleTooltipClose,
    onPointerEnter: (event: React.PointerEvent<HTMLButtonElement>) => revealLabel(event, label),
    onPointerLeave: scheduleTooltipClose,
  });
  const navigate = (menu: string) => {
    setTooltip(null);
    onNavigate(menu);
    onMobileOpenChange(false);
  };
  const groups = [
    { id: 'overview', label: '', items: [{ id: 'overview', label: labels.overview, icon: LayoutDashboard }] },
    { id: 'operations', label: en ? 'Operations' : 'Operasional', items: [
      { id: 'stok', label: labels.inventory, icon: Database },
      { id: 'pos', label: en ? 'Point of Sale' : 'Kasir penjualan', icon: Receipt },
      { id: 'po', label: labels.procurement, icon: ShoppingCart },
      { id: 'keuangan', label: labels.finance, icon: FileText },
      { id: 'sdm', label: labels.hr, icon: Users },
    ] },
    { id: 'workspace', label: en ? 'Workspace' : 'Ruang kerja', items: [
      { id: 'analytics', label: labels.analytics, icon: BarChart3 },
      { id: 'billing', label: labels.billing, icon: CreditCard },
      { id: 'settings', label: labels.settings, icon: Settings },
    ] },
  ];

  return <>
    {mobileOpen && <button type="button" className="workspace-nav-backdrop" tabIndex={-1} aria-hidden="true" aria-label={closeLabel} onClick={() => onMobileOpenChange(false)} />}
    <aside ref={sidebar} id="workspace-navigation" className={`workspace-sidebar${mobileOpen ? ' is-open' : ''}`} data-collapsed={collapsed}
      role={mobileOpen ? 'dialog' : undefined} aria-modal={mobileOpen ? true : undefined} aria-label={en ? 'Main navigation' : 'Navigasi utama'}>
      <div className="workspace-sidebar-brand">
        <div className="workspace-sidebar-logo"><InventoraMark size={26} /><span className="workspace-sidebar-wordmark">Inventora</span></div>
        <button type="button" className="workspace-sidebar-icon workspace-sidebar-collapse" aria-label={collapseLabel} aria-expanded={!collapsed} aria-controls="workspace-menu"
          onClick={() => { setTooltip(null); setCollapsed(value => !value); }}>
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
        <button type="button" className="workspace-sidebar-icon workspace-sidebar-close" aria-label={closeLabel} onClick={() => onMobileOpenChange(false)}><X size={20} /></button>
      </div>
      {isDemo && <div className="workspace-sidebar-mode"><span>{en ? 'Demo workspace' : 'Ruang kerja demo'}</span><span className="workspace-sidebar-mode-short" aria-hidden="true">Demo</span></div>}
      <nav id="workspace-menu" className="workspace-sidebar-menu" aria-label={en ? 'Modules' : 'Modul'}>
        {groups.map(group => {
          const items = group.items.filter(item => canAccessMenu(role, item.id));
          if (!items.length) return null;
          return <div key={group.id} className="workspace-sidebar-group">
            {group.label && <p className="workspace-sidebar-group-label">{group.label}</p>}
            {items.map(item => {
              const active = activeMenu === item.id || (item.id === 'po' && ['purchase', 'new-po'].includes(activeMenu));
              const count = item.id === 'po' && pendingApprovalsCount > 0 ? pendingApprovalsCount : 0;
              const label = count ? `${item.label}, ${count} ${en ? 'pending approvals' : 'menunggu persetujuan'}` : item.label;
              return <button key={item.id} type="button" className={`workspace-sidebar-link${active ? ' is-active' : ''}`} data-menu={item.id}
                aria-label={label} aria-current={active ? 'page' : undefined} onClick={() => navigate(item.id)} {...tooltipEvents(label)}>
                <item.icon size={19} strokeWidth={1.7} aria-hidden="true" />
                <span className="workspace-sidebar-link-label">{item.label}</span>
                {!!count && <span className="workspace-sidebar-count" aria-hidden="true">{count > 99 ? '99+' : count}</span>}
              </button>;
            })}
          </div>;
        })}
      </nav>
      <div className="workspace-sidebar-account">
        <div className="workspace-sidebar-identity" title={`${email} · ${role}`}>
          <span className="workspace-sidebar-avatar" aria-hidden="true">{initials}</span>
          <div className="workspace-sidebar-account-text"><strong title={email}>{email}</strong><span>{role}</span></div>
        </div>
        <div className="workspace-sidebar-actions">
          <button type="button" className="workspace-sidebar-icon workspace-sidebar-theme" aria-label={themeLabel} onClick={onToggleTheme} {...tooltipEvents(themeLabel)}>
            <Moon size={17} className="workspace-sidebar-moon" aria-hidden="true" /><Sun size={17} className="workspace-sidebar-sun" aria-hidden="true" />
          </button>
          <button type="button" className="workspace-sidebar-logout" aria-label={labels.logout} onClick={onLogout} {...tooltipEvents(labels.logout)}>
            <LogOut size={17} aria-hidden="true" /><span>{labels.logout}</span>
          </button>
        </div>
      </div>
    </aside>
    {tooltip && createPortal(<div ref={tooltipPanel} className="workspace-sidebar-tooltip" role="tooltip" style={{ left: tooltip.left, top: tooltip.top }}
      onPointerEnter={cancelTooltipClose} onPointerLeave={scheduleTooltipClose}>{tooltip.label}</div>, document.body)}
  </>;
}
