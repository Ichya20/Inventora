import React, { useState } from 'react';
import { PieChart, TrendingUp, AlertTriangle, ShieldCheck, ArrowUpRight, DollarSign } from 'lucide-react';
import { DepartmentBudget } from '../types';

export const DEFAULT_DEPARTMENT_BUDGETS: DepartmentBudget[] = [
  {
    id: 'dept-it',
    name: 'IT Infrastructure',
    code: 'CC-101-IT',
    quarter: 'Q3 2026',
    allocated: 4500000000,
    spent: 3120000000,
    committed: 650000000,
    currency: 'IDR'
  },
  {
    id: 'dept-ops',
    name: 'Operations & Logistics',
    code: 'CC-202-OPS',
    quarter: 'Q3 2026',
    allocated: 2800000000,
    spent: 1980000000,
    committed: 420000000,
    currency: 'IDR'
  },
  {
    id: 'dept-rnd',
    name: 'Engineering & R&D',
    code: 'CC-303-RND',
    quarter: 'Q3 2026',
    allocated: 2200000000,
    spent: 1450000000,
    committed: 210000000,
    currency: 'IDR'
  },
  {
    id: 'dept-hr',
    name: 'HR & GA',
    code: 'CC-404-HR',
    quarter: 'Q3 2026',
    allocated: 1200000000,
    spent: 1110000000,
    committed: 75000000,
    currency: 'IDR'
  }
];

interface DepartmentBudgetCardProps {
  budgets?: DepartmentBudget[];
  lang?: 'en' | 'id';
  onSelectDepartment?: (dept: DepartmentBudget) => void;
}

export function DepartmentBudgetCard({
  budgets = DEFAULT_DEPARTMENT_BUDGETS,
  lang = 'en',
  onSelectDepartment
}: DepartmentBudgetCardProps) {
  const [selectedQuarter, setSelectedQuarter] = useState('Q3 2026');

  const totalAllocated = budgets.reduce((acc, b) => acc + b.allocated, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
  const totalCommitted = budgets.reduce((acc, b) => acc + b.committed, 0);
  const totalRemaining = totalAllocated - (totalSpent + totalCommitted);
  const totalBurnRate = Math.round(((totalSpent + totalCommitted) / totalAllocated) * 100);

  return (
    <div className="bg-white dark:bg-[#111] p-5 md:p-6 rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#0070f3]/10 text-[#0070f3] dark:text-[#3291ff]">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm tracking-tight text-neutral-900 dark:text-neutral-100">
              {lang === 'en' ? 'Departmental Budget vs. Actual Variance' : 'Realisasi Anggaran vs Aktual Departemen'}
            </h3>
            <p className="text-xs text-neutral-500">
              {lang === 'en'
                ? 'Real-time cost-center allocation, commitment reserves & variance tracking'
                : 'Alokasi pusat biaya, cadangan komitmen & pelacakan varians belanja'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            {selectedQuarter}
          </span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
            totalBurnRate > 90
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              : totalBurnRate > 75
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          }`}>
            {totalBurnRate}% {lang === 'en' ? 'Committed' : 'Terpakai'}
          </span>
        </div>
      </div>

      {/* Aggregate Overview Bars */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-neutral-800 text-xs">
        <div>
          <span className="text-neutral-400 block text-[11px]">{lang === 'en' ? 'Total Allocated' : 'Total Alokasi'}</span>
          <span className="font-mono font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
            Rp {(totalAllocated / 1000000000).toFixed(1)} M
          </span>
        </div>
        <div>
          <span className="text-neutral-400 block text-[11px]">{lang === 'en' ? 'Disbursed (Spent)' : 'Terealisasi (Spent)'}</span>
          <span className="font-mono font-semibold text-neutral-800 dark:text-neutral-200 text-sm">
            Rp {(totalSpent / 1000000000).toFixed(1)} M
          </span>
        </div>
        <div>
          <span className="text-neutral-400 block text-[11px]">{lang === 'en' ? 'Committed in Open POs' : 'Komitmen PO Berjalan'}</span>
          <span className="font-mono font-semibold text-[#0070f3] dark:text-[#3291ff] text-sm">
            Rp {(totalCommitted / 1000000).toFixed(0)} Jt
          </span>
        </div>
        <div>
          <span className="text-neutral-400 block text-[11px]">{lang === 'en' ? 'Available Headroom' : 'Sisa Anggaran'}</span>
          <span className={`font-mono font-semibold text-sm ${totalRemaining > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            Rp {(totalRemaining / 1000000000).toFixed(2)} M
          </span>
        </div>
      </div>

      {/* Department Breakdown List */}
      <div className="space-y-3.5">
        {budgets.map((b) => {
          const used = b.spent + b.committed;
          const pct = Math.min(100, Math.round((used / b.allocated) * 100));
          const remaining = b.allocated - used;
          const isCritical = pct >= 90;
          const isWarning = pct >= 75 && pct < 90;

          return (
            <div
              key={b.id}
              onClick={() => onSelectDepartment?.(b)}
              className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer bg-white dark:bg-neutral-900/30 space-y-2.5"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100">{b.name}</span>
                  <span className="font-mono text-[10px] text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
                    {b.code}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-neutral-600 dark:text-neutral-400">
                    Rp {(used / 1000000).toLocaleString('id-ID')} Jt / {(b.allocated / 1000000).toLocaleString('id-ID')} Jt
                  </span>
                  <span className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                    isCritical
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      : isWarning
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {pct}%
                  </span>
                </div>
              </div>

              {/* Progress Bar with Committed vs Spent segments */}
              <div className="w-full bg-neutral-100 dark:bg-neutral-800 rounded-full h-2.5 overflow-hidden flex">
                <div
                  className="bg-[#0070f3] h-full transition-all duration-500"
                  style={{ width: `${Math.round((b.spent / b.allocated) * 100)}%` }}
                  title={`Spent: Rp ${(b.spent / 1000000).toFixed(0)} Jt`}
                />
                <div
                  className="bg-sky-400 dark:bg-sky-500 h-full opacity-70 transition-all duration-500"
                  style={{ width: `${Math.round((b.committed / b.allocated) * 100)}%` }}
                  title={`Committed: Rp ${(b.committed / 1000000).toFixed(0)} Jt`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#0070f3] inline-block" />
                    {lang === 'en' ? 'Disbursed' : 'Terealisasi'}: Rp {(b.spent / 1000000).toFixed(0)}M
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
                    {lang === 'en' ? 'Open POs' : 'Komitmen PO'}: Rp {(b.committed / 1000000).toFixed(0)}M
                  </span>
                </div>
                <span className={remaining < 150000000 ? 'text-rose-500 font-semibold' : 'text-neutral-500'}>
                  {lang === 'en' ? 'Headroom' : 'Sisa'}: Rp {(remaining / 1000000).toFixed(0)} Jt
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Utility function to check if a proposed PO amount exceeds departmental budget
export function checkDepartmentBudgetLimit(
  departmentName: string,
  amount: number,
  budgets: DepartmentBudget[] = DEFAULT_DEPARTMENT_BUDGETS
): {
  isExceeded: boolean;
  isNearCap: boolean;
  departmentBudget?: DepartmentBudget;
  projectedPercentage: number;
  availableBefore: number;
  availableAfter: number;
} {
  const dept = budgets.find(b => b.name.toLowerCase() === departmentName.toLowerCase()) || budgets[0];
  const usedCurrent = dept.spent + dept.committed;
  const availableBefore = dept.allocated - usedCurrent;
  const projectedTotal = usedCurrent + amount;
  const projectedPercentage = Math.round((projectedTotal / dept.allocated) * 100);
  const availableAfter = dept.allocated - projectedTotal;

  return {
    isExceeded: projectedTotal > dept.allocated,
    isNearCap: projectedPercentage >= 90 && projectedTotal <= dept.allocated,
    departmentBudget: dept,
    projectedPercentage,
    availableBefore,
    availableAfter
  };
}
