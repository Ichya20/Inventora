import React from 'react';
import { UserCircle } from 'lucide-react';
import type { Language } from '../types';
import { Button } from './UI';

type Props = {
  lang: Language;
  account?: { displayName?: string | null; email?: string | null };
  onNavigate: (menu: string) => void;
};

export function AccountOverview({ lang, account, onNavigate }: Props) {
  const en = lang === 'en';
  return <section className="workspace-overview" aria-label={en ? 'Your account' : 'Akun Anda'}>
    <div className="overview-heading">
      <div><p className="eyebrow">Inventora / {en ? 'Account' : 'Akun'}</p>
        <h2>{en ? 'Your account' : 'Akun Anda'}</h2>
        <p className="overview-description">{en ? 'View your profile and choose your preferred language.' : 'Lihat profil dan pilih bahasa yang Anda gunakan.'}</p>
      </div>
      <span className="source-tag">User</span>
    </div>
    <article className="dashboard-panel p-5 sm:p-6">
      <div className="panel-heading"><div><p className="eyebrow">{en ? 'Profile' : 'Profil'}</p>
        <h3>{account?.displayName || (en ? 'Google account' : 'Akun Google')}</h3></div>
        <UserCircle size={24} aria-hidden="true"/>
      </div>
      <dl className="po-metadata">
        <div><dt>Email</dt><dd>{account?.email || '—'}</dd></div>
        <div><dt>{en ? 'Account role' : 'Peran akun'}</dt><dd>User</dd></div>
      </dl>
      <p className="text-sm text-[var(--ws-muted)] my-5">{en
        ? 'Your account has basic access. Contact your administrator if your work requires access to operational modules.'
        : 'Akun Anda memiliki akses dasar. Hubungi administrator jika pekerjaan Anda memerlukan akses ke modul operasional.'}</p>
      <Button variant="secondary" onClick={() => onNavigate('settings')}>{en ? 'Account settings' : 'Pengaturan akun'}</Button>
    </article>
  </section>;
}
