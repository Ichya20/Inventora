import React, { useState } from 'react';
import { Shield, Lock, Check, CheckSquare, Square, RefreshCw, KeyRound, AlertCircle, Save } from 'lucide-react';
import { Role } from '../types';
import { Button } from './UI';

export interface PermissionDefinition {
  id: string;
  label: string;
  category: 'Procurement' | 'Finance' | 'Warehouse' | 'HR' | 'System';
  description: string;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    id: 'PO_APPROVE_HIGH',
    label: 'Approve High-Value POs (> Rp 300M)',
    category: 'Procurement',
    description: 'Executive signing authority for capital expenditure and major hardware procurement.'
  },
  {
    id: 'PAYMENT_GATEWAY',
    label: 'Disburse Corporate Payment Gateway',
    category: 'Finance',
    description: 'Execute bank transfers, corporate virtual accounts, and RTGS settlement dispatches.'
  },
  {
    id: 'GRN_INSPECTION',
    label: 'Issue Goods Receipt Notes (GRN)',
    category: 'Warehouse',
    description: 'Perform physical delivery dock inspections and issue 3-way matching goods receipts.'
  },
  {
    id: 'INVENTORY_DISPATCH',
    label: 'Adjust Stock & Deploy Assets',
    category: 'Warehouse',
    description: 'Manually adjust stock safety margins and commission hardware to production racks.'
  },
  {
    id: 'BUDGET_OVERRIDE',
    label: 'Override Departmental Budget Ceilings',
    category: 'Finance',
    description: 'Authorize emergency procurement orders that exceed quarterly cost-center limits.'
  },
  {
    id: 'EXPORT_AUDIT',
    label: 'Export Raw Financial Ledgers & Audits',
    category: 'System',
    description: 'Download CSV and Excel files of full transaction ledgers and immutable audit logs.'
  },
  {
    id: 'SALARY_VIEW',
    label: 'View Executive Compensation & Payroll',
    category: 'HR',
    description: 'Access employee salary tables, tax withholding records, and bonus structures.'
  },
  {
    id: 'USER_MGMT',
    label: 'System User & Role Management',
    category: 'System',
    description: 'Provision new employee credentials and modify organizational access matrices.'
  }
];

export const INITIAL_ROLE_PERMISSIONS: Record<Role, string[]> = {
  'Super Admin': [
    'PO_APPROVE_HIGH',
    'PAYMENT_GATEWAY',
    'GRN_INSPECTION',
    'INVENTORY_DISPATCH',
    'BUDGET_OVERRIDE',
    'EXPORT_AUDIT',
    'SALARY_VIEW',
    'USER_MGMT'
  ],
  'Finance Manager': [
    'PO_APPROVE_HIGH',
    'PAYMENT_GATEWAY',
    'BUDGET_OVERRIDE',
    'EXPORT_AUDIT'
  ],
  'Warehouse Manager': [
    'GRN_INSPECTION',
    'INVENTORY_DISPATCH',
    'EXPORT_AUDIT'
  ],
  'HR Manager': [
    'SALARY_VIEW',
    'EXPORT_AUDIT'
  ]
};

interface RbacSettingsMatrixProps {
  currentRole: Role;
  onRoleChange: (newRole: Role) => void;
  lang?: 'en' | 'id';
}

export function RbacSettingsMatrix({
  currentRole,
  onRoleChange,
  lang = 'en'
}: RbacSettingsMatrixProps) {
  const [matrix, setMatrix] = useState<Record<Role, string[]>>(() => {
    const saved = localStorage.getItem('inventora_rbac_matrix');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_ROLE_PERMISSIONS;
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const roles: Role[] = ['Super Admin', 'Finance Manager', 'Warehouse Manager', 'HR Manager'];

  const togglePermission = (role: Role, permId: string) => {
    // Prevent unchecking Super Admin root permissions if desired, or allow custom configuration
    setMatrix(prev => {
      const currentPerms = prev[role] || [];
      const hasPerm = currentPerms.includes(permId);
      const updated = hasPerm
        ? currentPerms.filter(p => p !== permId)
        : [...currentPerms, permId];

      setHasChanges(true);
      setSaveSuccess(false);
      return { ...prev, [role]: updated };
    });
  };

  const handleSave = () => {
    localStorage.setItem('inventora_rbac_matrix', JSON.stringify(matrix));
    setHasChanges(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleReset = () => {
    setMatrix(INITIAL_ROLE_PERMISSIONS);
    localStorage.removeItem('inventora_rbac_matrix');
    setHasChanges(false);
  };

  return (
    <div className="bg-white dark:bg-[#111] p-5 md:p-6 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm tracking-tight text-neutral-900 dark:text-neutral-100">
              {lang === 'en' ? 'Role-Based Access Control (RBAC) Matrix' : 'Matriks Hak Akses Berbasis Peran (RBAC)'}
            </h3>
            <p className="text-xs text-neutral-500">
              {lang === 'en'
                ? 'Configure granular capability gates, signing ceilings & system authority per role'
                : 'Konfigurasi hak otorisasi transaksi, plafon persetujuan & wewenang sistem per peran'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="primary" onClick={handleSave}>
              <Save className="w-3.5 h-3.5 mr-1" />
              {lang === 'en' ? 'Save Matrix' : 'Simpan Hak Akses'}
            </Button>
          )}
          {saveSuccess && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> {lang === 'en' ? 'Saved' : 'Tersimpan'}
            </span>
          )}
          <Button variant="secondary" onClick={handleReset}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            {lang === 'en' ? 'Reset Defaults' : 'Reset Default'}
          </Button>
        </div>
      </div>

      {/* Role Preview Switcher Banner */}
      <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div>
          <span className="font-semibold text-neutral-800 dark:text-neutral-200 block">
            {lang === 'en' ? 'Active Session Role Emulation' : 'Emulasi Peran Sesi Aktif'}
          </span>
          <span className="text-neutral-500 text-[11px]">
            {lang === 'en'
              ? 'Switch your active session role to verify UI capability gates directly in real-time.'
              : 'Ganti peran sesi aktif untuk menguji batasan hak akses UI secara langsung.'}
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {roles.map(r => (
            <button
              key={r}
              onClick={() => onRoleChange(r)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all text-xs cursor-pointer ${
                currentRole === r
                  ? 'bg-[#0070f3] text-white shadow-sm'
                  : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Matrix Table */}
      <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-x-auto">
        <table className="w-full text-xs text-left min-w-[640px]">
          <thead className="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 font-semibold border-b border-neutral-200 dark:border-neutral-800">
            <tr>
              <th className="py-3 px-4 w-1/2">{lang === 'en' ? 'System Capability / Gate' : 'Kemampuan / Hak Akses Sistem'}</th>
              {roles.map(r => (
                <th key={r} className="py-3 px-3 text-center whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    currentRole === r
                      ? 'bg-[#0070f3]/15 text-[#0070f3] dark:text-[#3291ff]'
                      : 'text-neutral-700 dark:text-neutral-300'
                  }`}>
                    {r.replace(' Manager', '')}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900/30">
            {PERMISSION_DEFINITIONS.map(perm => {
              return (
                <tr key={perm.id} className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-100">{perm.label}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                        {perm.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">{perm.description}</p>
                  </td>

                  {roles.map(r => {
                    const hasPerm = (matrix[r] || []).includes(perm.id);
                    return (
                      <td key={r} className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => togglePermission(r, perm.id)}
                          className={`p-1.5 rounded-md transition-all cursor-pointer inline-flex items-center justify-center ${
                            hasPerm
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-300 dark:text-neutral-600 hover:text-neutral-500'
                          }`}
                          title={`Toggle ${perm.label} for ${r}`}
                        >
                          {hasPerm ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
