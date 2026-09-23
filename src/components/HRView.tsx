import React, { useState, useMemo, useEffect } from 'react';
import { Card, Badge, Button, TableWrapper, Th, Td, Tr, Modal } from './UI';
import { ToastType } from '../types';
import { translations, Language, Translations } from '../i18n';
import { useDebounce } from '../lib/useDebounce';
import { exportToCsv } from '../lib/exportUtils';
import { loadStoredData, saveStoredData } from '../lib/storageUtils';
import { downloadPayslipPdf, PayslipData } from '../lib/pdfGenerator';
import { playNotificationChime } from './InteractiveToaster';
import { 
  CreditCard, 
  Download, 
  ArrowLeft, 
  CheckCircle2, 
  Building2, 
  ShieldCheck, 
  Send,
  Clock,
  History,
  Users,
  Search,
  Check,
  AlertCircle,
  FileText,
  Calendar,
  Filter,
  RefreshCw,
  Lock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export interface EmployeeSalary {
  baseSalary: number;
  positionAllowance: number;
  transportAllowance: number;
  bonus: number;
  bpjsKesehatan: number;
  bpjsKetenagakerjaan: number;
  pph21: number;
  bankName: string;
  accountNumber: string;
  disbursementStatus: 'Disbursed' | 'Scheduled' | 'Pending Approval';
  lastDisbursed?: string;
  disbursementRef?: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  dept: string;
  role: string;
  status: string;
  color: 'green' | 'gray' | 'red';
  joined: string;
  taxId?: string;
  salary: EmployeeSalary;
}

export interface PayrollDisbursementRecord {
  id: string;
  referenceNumber: string;
  empId: string;
  empName: string;
  dept: string;
  role: string;
  taxId?: string;
  period: string;
  disbursedAt: string;
  disbursedDateFormatted: string;
  baseSalary: number;
  allowances: number;
  bonus: number;
  gross: number;
  deductions: number;
  pph21: number;
  bpjs: number;
  netPay: number;
  bankName: string;
  accountNumber: string;
  actor: string;
  status: 'SUCCESS' | 'SCHEDULED';
}

interface HRViewProps {
  onToast: (msg: string, type?: ToastType) => void;
  t?: Translations;
  lang?: Language;
}

export function HRView({ onToast, t, lang = 'en' }: HRViewProps) {
  const activeT = t || translations[lang] || translations.en;

  // View modes: Directory vs Disbursement History
  const [hrTab, setHrTab] = useState<'directory' | 'history'>('directory');
  const [payrollFilter, setPayrollFilter] = useState<'all' | 'pending' | 'disbursed'>('all');

  // Search states
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 180);

  const [historySearch, setHistorySearch] = useState('');
  const debouncedHistorySearch = useDebounce(historySearch, 180);

  const defaultEmployees: Employee[] = [
    { 
      id: 'EMP-10024', 
      name: 'Budi Santoso', 
      email: 'budi.s@inventora.com', 
      dept: 'Engineering', 
      role: 'Senior AI Engineer', 
      status: lang === 'en' ? 'Active' : 'Aktif', 
      color: 'green' as const, 
      joined: '12 Jan 2022',
      taxId: '09.342.189.4-012.000',
      salary: {
        baseSalary: 28500000,
        positionAllowance: 4500000,
        transportAllowance: 1500000,
        bonus: 2500000,
        bpjsKesehatan: 285000,
        bpjsKetenagakerjaan: 855000,
        pph21: 1850000,
        bankName: 'Bank Central Asia (BCA)',
        accountNumber: '8830-1928-33',
        disbursementStatus: 'Disbursed',
        lastDisbursed: '25 Aug 2026',
        disbursementRef: 'TRX-PAY-202608-8831'
      }
    },
    { 
      id: 'EMP-10088', 
      name: 'Siti Rahmawati', 
      email: 'siti.r@inventora.com', 
      dept: 'Finance', 
      role: 'Financial Controller', 
      status: lang === 'en' ? 'Annual Leave' : 'Cuti Tahunan', 
      color: 'gray' as const, 
      joined: '04 Mar 2023',
      taxId: '12.871.902.1-015.000',
      salary: {
        baseSalary: 24000000,
        positionAllowance: 3800000,
        transportAllowance: 1200000,
        bonus: 1500000,
        bpjsKesehatan: 240000,
        bpjsKetenagakerjaan: 720000,
        pph21: 1420000,
        bankName: 'Bank Mandiri',
        accountNumber: '137-00-192831-2',
        disbursementStatus: 'Disbursed',
        lastDisbursed: '25 Aug 2026',
        disbursementRef: 'TRX-PAY-202608-9942'
      }
    },
    { 
      id: 'EMP-10091', 
      name: 'Andi Wijaya', 
      email: 'andi.w@inventora.com', 
      dept: 'Operations', 
      role: 'Ops Manager', 
      status: lang === 'en' ? 'Active' : 'Aktif', 
      color: 'green' as const, 
      joined: '15 Aug 2021',
      taxId: '21.503.712.9-021.000',
      salary: {
        baseSalary: 22000000,
        positionAllowance: 3200000,
        transportAllowance: 1400000,
        bonus: 1200000,
        bpjsKesehatan: 220000,
        bpjsKetenagakerjaan: 660000,
        pph21: 1250000,
        bankName: 'Bank Rakyat Indonesia (BRI)',
        accountNumber: '0206-01-002931-50-8',
        disbursementStatus: 'Scheduled',
        lastDisbursed: '25 Aug 2026'
      }
    },
    { 
      id: 'EMP-10105', 
      name: 'Rina Kusuma', 
      email: 'rina.k@inventora.com', 
      dept: 'HR', 
      role: 'HR Specialist', 
      status: lang === 'en' ? 'Sick Leave' : 'Sakit', 
      color: 'red' as const, 
      joined: '10 Feb 2024',
      taxId: '34.192.831.0-032.000',
      salary: {
        baseSalary: 16500000,
        positionAllowance: 2000000,
        transportAllowance: 1000000,
        bonus: 800000,
        bpjsKesehatan: 165000,
        bpjsKetenagakerjaan: 495000,
        pph21: 820000,
        bankName: 'Bank Central Asia (BCA)',
        accountNumber: '527-1829-011',
        disbursementStatus: 'Scheduled',
        lastDisbursed: '25 Aug 2026'
      }
    },
    { 
      id: 'EMP-10112', 
      name: 'Joko Anwar', 
      email: 'joko.a@inventora.com', 
      dept: 'Engineering', 
      role: 'Backend Engineer', 
      status: lang === 'en' ? 'Active' : 'Aktif', 
      color: 'green' as const, 
      joined: '01 Nov 2023',
      taxId: '45.819.201.8-041.000',
      salary: {
        baseSalary: 21000000,
        positionAllowance: 2500000,
        transportAllowance: 1200000,
        bonus: 1800000,
        bpjsKesehatan: 210000,
        bpjsKetenagakerjaan: 630000,
        pph21: 1180000,
        bankName: 'Bank Negara Indonesia (BNI)',
        accountNumber: '081-928-3011',
        disbursementStatus: 'Pending Approval',
        lastDisbursed: '25 Aug 2026'
      }
    },
  ];

  const defaultPayrollHistory: PayrollDisbursementRecord[] = [
    {
      id: 'PAY-REC-20260825-10024',
      referenceNumber: 'TRX-PAY-202608-8831',
      empId: 'EMP-10024',
      empName: 'Budi Santoso',
      dept: 'Engineering',
      role: 'Senior AI Engineer',
      taxId: '09.342.189.4-012.000',
      period: 'August 2026',
      disbursedAt: '2026-08-25T10:14:00Z',
      disbursedDateFormatted: '25 Aug 2026, 10:14',
      baseSalary: 28500000,
      allowances: 6000000,
      bonus: 2500000,
      gross: 37000000,
      deductions: 2990000,
      pph21: 1850000,
      bpjs: 1140000,
      netPay: 34010000,
      bankName: 'Bank Central Asia (BCA)',
      accountNumber: '8830-1928-33',
      actor: 'Automated Batch Payroll',
      status: 'SUCCESS'
    },
    {
      id: 'PAY-REC-20260825-10088',
      referenceNumber: 'TRX-PAY-202608-9942',
      empId: 'EMP-10088',
      empName: 'Siti Rahmawati',
      dept: 'Finance',
      role: 'Financial Controller',
      taxId: '12.871.902.1-015.000',
      period: 'August 2026',
      disbursedAt: '2026-08-25T10:15:30Z',
      disbursedDateFormatted: '25 Aug 2026, 10:15',
      baseSalary: 24000000,
      allowances: 5000000,
      bonus: 1500000,
      gross: 30500000,
      deductions: 2380000,
      pph21: 1420000,
      bpjs: 960000,
      netPay: 28120000,
      bankName: 'Bank Mandiri',
      accountNumber: '137-00-192831-2',
      actor: 'Automated Batch Payroll',
      status: 'SUCCESS'
    }
  ];

  // Employee state
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const loaded = loadStoredData('inventora_hr_employees_v2', defaultEmployees);
    return loaded.map((emp: any, idx: number) => {
      const fallback = defaultEmployees[idx] || defaultEmployees[0];
      return {
        ...fallback,
        ...emp,
        taxId: emp.taxId || fallback.taxId,
        salary: emp.salary || fallback.salary
      };
    });
  });

  useEffect(() => {
    saveStoredData('inventora_hr_employees_v2', employees);
  }, [employees]);

  // Payroll history state
  const [payrollHistory, setPayrollHistory] = useState<PayrollDisbursementRecord[]>(() => {
    return loadStoredData('inventora_hr_payroll_history_v2', defaultPayrollHistory);
  });

  useEffect(() => {
    saveStoredData('inventora_hr_payroll_history_v2', payrollHistory);
  }, [payrollHistory]);

  // Modals state
  const [activeProfile, setActiveProfile] = useState<Employee | null>(null);
  const [activePayrollEmployee, setActivePayrollEmployee] = useState<Employee | null>(null);
  const [activeHistoryDetail, setActiveHistoryDetail] = useState<PayrollDisbursementRecord | null>(null);
  const [editableBonus, setEditableBonus] = useState<number>(0);
  const [isDisbursing, setIsDisbursing] = useState<boolean>(false);
  const [allowReDisburse, setAllowReDisburse] = useState<boolean>(false);

  // Sync editable bonus when opening an employee
  useEffect(() => {
    if (activePayrollEmployee?.salary) {
      setEditableBonus(activePayrollEmployee.salary.bonus || 0);
      setAllowReDisburse(false);
    }
  }, [activePayrollEmployee]);

  // Pagination & Sorting for Directory
  const [page, setPage] = useState(1);
  const itemsPerPage = 5;
  const [sortConfig, setSortConfig] = useState<{ key: keyof Employee, direction: 'asc' | 'desc' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Pagination for History
  const [historyPage, setHistoryPage] = useState(1);
  const historyItemsPerPage = 6;
  const [isExportingHistory, setIsExportingHistory] = useState(false);

  // Counts for tabs
  const pendingEmployeesCount = useMemo(() => {
    return employees.filter(e => e.salary?.disbursementStatus !== 'Disbursed').length;
  }, [employees]);

  const disbursedEmployeesCount = useMemo(() => {
    return employees.filter(e => e.salary?.disbursementStatus === 'Disbursed').length;
  }, [employees]);

  const handleSort = (key: keyof Employee) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      if (!sortConfig) return 0;
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [employees, sortConfig]);

  const filteredEmployees = useMemo(() => {
    return sortedEmployees.filter(emp => {
      // Payroll filter
      if (payrollFilter === 'pending' && emp.salary?.disbursementStatus === 'Disbursed') {
        return false;
      }
      if (payrollFilter === 'disbursed' && emp.salary?.disbursementStatus !== 'Disbursed') {
        return false;
      }

      // Search filter
      if (!debouncedSearch.trim()) return true;
      const q = debouncedSearch.toLowerCase();
      return (
        emp.name.toLowerCase().includes(q) || 
        emp.id.toLowerCase().includes(q) ||
        emp.dept.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q)
      );
    });
  }, [sortedEmployees, debouncedSearch, payrollFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / itemsPerPage));
  const paginatedEmployees = useMemo(() => {
    return filteredEmployees.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredEmployees, page, itemsPerPage]);

  // Filtered History
  const filteredHistory = useMemo(() => {
    if (!debouncedHistorySearch.trim()) return payrollHistory;
    const q = debouncedHistorySearch.toLowerCase();
    return payrollHistory.filter(h => 
      h.empName.toLowerCase().includes(q) ||
      h.empId.toLowerCase().includes(q) ||
      h.referenceNumber.toLowerCase().includes(q) ||
      h.dept.toLowerCase().includes(q) ||
      h.bankName.toLowerCase().includes(q)
    );
  }, [payrollHistory, debouncedHistorySearch]);

  const totalHistoryPages = Math.max(1, Math.ceil(filteredHistory.length / historyItemsPerPage));
  const paginatedHistory = useMemo(() => {
    return filteredHistory.slice((historyPage - 1) * historyItemsPerPage, historyPage * historyItemsPerPage);
  }, [filteredHistory, historyPage, historyItemsPerPage]);

  // Export Directory
  const handleExport = () => {
    setIsExporting(true);
    try {
      const headers = ['Employee ID', 'Full Name', 'Corporate Email', 'Department', 'Job Title / Role', 'Status', 'Date Joined', 'Payroll Status', 'Base Salary', 'Bank'];
      const rows = filteredEmployees.map(emp => [
        emp.id,
        emp.name,
        emp.email,
        emp.dept,
        emp.role,
        emp.status,
        emp.joined,
        emp.salary?.disbursementStatus || 'Scheduled',
        emp.salary?.baseSalary || 0,
        emp.salary?.bankName || '-'
      ]);
      exportToCsv(`inventora-employee-directory-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
      onToast(lang === 'en' ? "Employee directory exported as CSV" : "Direktori pegawai berhasil diekspor sebagai CSV", "success");
    } catch {
      onToast("Export failed", "error");
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  };

  // Export History
  const handleExportHistory = () => {
    setIsExportingHistory(true);
    try {
      const headers = [
        'Reference No', 
        'Employee ID', 
        'Employee Name', 
        'Department', 
        'Role', 
        'Payroll Period', 
        'Disbursed Timestamp', 
        'Gross (IDR)', 
        'Deductions (IDR)', 
        'Take-Home Pay (IDR)', 
        'Bank Name', 
        'Account Number', 
        'Disbursed By', 
        'Status'
      ];
      const rows = filteredHistory.map(rec => [
        rec.referenceNumber,
        rec.empId,
        rec.empName,
        rec.dept,
        rec.role,
        rec.period,
        rec.disbursedDateFormatted,
        rec.gross,
        rec.deductions,
        rec.netPay,
        rec.bankName,
        rec.accountNumber,
        rec.actor,
        rec.status
      ]);
      exportToCsv(`inventora-payroll-history-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
      onToast(
        lang === 'en' ? "Payroll disbursement history exported to CSV" : "Riwayat pencairan gaji berhasil diekspor ke CSV", 
        "success"
      );
    } catch {
      onToast("Export failed", "error");
    } finally {
      setTimeout(() => setIsExportingHistory(false), 500);
    }
  };

  const handleOnboardToCalendar = async (emp: any) => {
    const { getAccessToken } = await import('../firebase');
    const token = await getAccessToken();
    if (!token) {
      onToast(lang === 'en' ? "Please sign in first to export to Google Calendar" : "Silakan login terlebih dahulu untuk ekspor ke Google Calendar", "error");
      return;
    }
    try {
      const event = {
        summary: `Onboarding: ${emp.name}`,
        description: `Role: ${emp.role}\nDepartment: ${emp.dept}\nEmail: ${emp.email}`,
        start: {
          dateTime: new Date(Date.now() + 86400000).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: new Date(Date.now() + 86400000 + 3600000).toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
      
      if (!res.ok) throw new Error('Failed to create calendar event');
      
      onToast(
        lang === 'en' 
          ? `Onboarding event for ${emp.name} created in Calendar` 
          : `Jadwal onboarding untuk ${emp.name} berhasil dibuat di Calendar`,
        "success"
      );
    } catch (e: any) {
      onToast(`Calendar export failed: ${e.message}`, "error");
    }
  };

  // Helper for live payroll calculations
  const calculatePayroll = (emp: Employee, currentBonus: number) => {
    const s = emp.salary;
    const base = s?.baseSalary || 0;
    const pos = s?.positionAllowance || 0;
    const trans = s?.transportAllowance || 0;
    const bonus = currentBonus;
    const gross = base + pos + trans + bonus;
    
    // BPJS Kesehatan (1% employee)
    const bpjsKes = s?.bpjsKesehatan || Math.round(base * 0.01);
    // BPJS Ketenagakerjaan (3% employee: JHT 2% + JP 1%)
    const bpjsTk = s?.bpjsKetenagakerjaan || Math.round(base * 0.03);
    // PPh 21 TER
    const pph21 = s?.pph21 || Math.round(gross * 0.05);

    const totalDeductions = bpjsKes + bpjsTk + pph21;
    const netPay = Math.max(0, gross - totalDeductions);

    return {
      base,
      pos,
      trans,
      bonus,
      gross,
      bpjsKes,
      bpjsTk,
      pph21,
      totalDeductions,
      netPay
    };
  };

  // Handle immediate bank transfer & record into history
  const handleDisbursePayroll = (emp: Employee) => {
    setIsDisbursing(true);
    setTimeout(() => {
      const calc = calculatePayroll(emp, editableBonus);
      const now = new Date();
      const formattedDate = now.toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
      const formattedDateTime = now.toLocaleDateString(lang === 'en' ? 'en-US' : 'id-ID', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const refNum = `TRX-PAY-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newHistoryRecord: PayrollDisbursementRecord = {
        id: `PAY-REC-${Date.now()}`,
        referenceNumber: refNum,
        empId: emp.id,
        empName: emp.name,
        dept: emp.dept,
        role: emp.role,
        taxId: emp.taxId,
        period: 'September 2026',
        disbursedAt: now.toISOString(),
        disbursedDateFormatted: formattedDateTime,
        baseSalary: calc.base,
        allowances: calc.pos + calc.trans,
        bonus: editableBonus,
        gross: calc.gross,
        deductions: calc.totalDeductions,
        pph21: calc.pph21,
        bpjs: calc.bpjsKes + calc.bpjsTk,
        netPay: calc.netPay,
        bankName: emp.salary?.bankName || 'BCA',
        accountNumber: emp.salary?.accountNumber || '8830-1928-33',
        actor: 'Finance & HR Lead',
        status: 'SUCCESS'
      };

      const updated = employees.map(item => {
        if (item.id === emp.id) {
          return {
            ...item,
            salary: {
              ...item.salary,
              bonus: editableBonus,
              disbursementStatus: 'Disbursed' as const,
              lastDisbursed: formattedDate,
              disbursementRef: refNum
            }
          };
        }
        return item;
      });

      setEmployees(updated);
      setPayrollHistory(prev => [newHistoryRecord, ...prev]);

      setActivePayrollEmployee(prev => prev ? {
        ...prev,
        salary: {
          ...prev.salary,
          bonus: editableBonus,
          disbursementStatus: 'Disbursed',
          lastDisbursed: formattedDate,
          disbursementRef: refNum
        }
      } : null);

      setIsDisbursing(false);
      setAllowReDisburse(false);
      playNotificationChime('success');
      onToast(
        lang === 'en'
          ? `Payroll transfer of Rp ${calc.netPay.toLocaleString('en-US')} disbursed to ${emp.name}. Recorded in Payroll History (Ref: ${refNum}).`
          : `Gaji sebesar Rp ${calc.netPay.toLocaleString('id-ID')} berhasil ditransfer ke rekening ${emp.name}. Tercatat di Riwayat Payroll (Ref: ${refNum}).`,
        'success'
      );
    }, 900);
  };

  // Handle PDF Payslip generation from employee object
  const handleDownloadPayslip = (emp: Employee) => {
    const calc = calculatePayroll(emp, emp.salary?.bonus || 0);
    const data: PayslipData = {
      empId: emp.id,
      empName: emp.name,
      dept: emp.dept,
      role: emp.role,
      taxId: emp.taxId,
      period: 'September 2026',
      baseSalary: calc.base,
      positionAllowance: calc.pos,
      transportAllowance: calc.trans,
      bonus: calc.bonus,
      bpjsKesehatan: calc.bpjsKes,
      bpjsKetenagakerjaan: calc.bpjsTk,
      pph21: calc.pph21,
      netPay: calc.netPay,
      bankName: emp.salary?.bankName || 'BCA',
      accountNumber: emp.salary?.accountNumber || '8830-1928-33',
      disbursementDate: emp.salary?.lastDisbursed || '25 Sep 2026'
    };
    downloadPayslipPdf(data, lang);
    onToast(lang === 'en' ? `Payslip PDF for ${emp.name} downloaded` : `Slip gaji PDF untuk ${emp.name} berhasil diunduh`, 'success');
  };

  // Handle PDF Payslip generation from history record
  const handleDownloadPayslipFromHistory = (rec: PayrollDisbursementRecord) => {
    const data: PayslipData = {
      empId: rec.empId,
      empName: rec.empName,
      dept: rec.dept,
      role: rec.role,
      taxId: rec.taxId,
      period: rec.period,
      baseSalary: rec.baseSalary,
      positionAllowance: Math.round(rec.allowances * 0.7),
      transportAllowance: Math.round(rec.allowances * 0.3),
      bonus: rec.bonus,
      bpjsKesehatan: Math.round(rec.bpjs * 0.25),
      bpjsKetenagakerjaan: Math.round(rec.bpjs * 0.75),
      pph21: rec.pph21,
      netPay: rec.netPay,
      bankName: rec.bankName,
      accountNumber: rec.accountNumber,
      disbursementDate: rec.disbursedDateFormatted
    };
    downloadPayslipPdf(data, lang);
    onToast(lang === 'en' ? `Payslip PDF for ${rec.empName} downloaded` : `Slip gaji PDF untuk ${rec.empName} berhasil diunduh`, 'success');
  };

  const totalDisbursedAmount = useMemo(() => {
    return payrollHistory.reduce((sum, item) => sum + item.netPay, 0);
  }, [payrollHistory]);

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      {/* Top Header & Tab Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 pb-1 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0070f3]" />
            <span>{lang === 'en' ? 'Human Resources & Payroll' : 'Sumber Daya Manusia & Payroll'}</span>
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {lang === 'en'
              ? 'Real-time employee directory, automated compensation calculation, and bank disbursement history.'
              : 'Direktori pegawai real-time, kalkulasi kompensasi otomatis, dan riwayat pencairan gaji perbankan.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setHrTab('directory')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              hrTab === 'directory'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#0070f3]" />
            <span>{lang === 'en' ? 'Employee Directory' : 'Direktori Pegawai'}</span>
            {pendingEmployeesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {pendingEmployeesCount} {lang === 'en' ? 'Pending' : 'Perlu Gaji'}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setHrTab('history')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              hrTab === 'history'
                ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === 'en' ? 'Disbursement History' : 'Riwayat Pencairan Gaji'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {payrollHistory.length}
            </span>
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">
            {activeT.hr.totalEmployees}
          </p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">
            {employees.length}
          </h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2 flex items-center justify-between">
            <span>
              <span className="text-[#0070f3] dark:text-[#3291ff] font-medium">+15 {lang === 'en' ? 'Recruits' : 'Rekrutmen'}</span> {activeT.hr.newHiresMonth}
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {disbursedEmployeesCount} {lang === 'en' ? 'Paid' : 'Lunas'}
            </span>
          </p>
        </Card>
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">
            {lang === 'en' ? 'September 2026 Payroll Progress' : 'Progres Payroll September 2026'}
          </p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums flex items-baseline gap-2">
            <span>{disbursedEmployeesCount} / {employees.length}</span>
            <span className="text-xs font-normal text-neutral-400">
              ({Math.round((disbursedEmployeesCount / (employees.length || 1)) * 100)}%)
            </span>
          </h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2 flex items-center gap-1.5">
            {pendingEmployeesCount === 0 ? (
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {lang === 'en' ? 'All employees disbursed for this cycle' : 'Semua karyawan telah diproses untuk periode ini'}
              </span>
            ) : (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {pendingEmployeesCount} {lang === 'en' ? 'personnel waiting disbursement' : 'pegawai menunggu pencairan transfer'}
              </span>
            )}
          </p>
        </Card>
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">
            {lang === 'en' ? 'Total Disbursed Funds' : 'Total Dana Gaji Ditransfer'}
          </p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums text-emerald-600 dark:text-emerald-400">
            Rp {Math.round(totalDisbursedAmount / 1000000).toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}M
          </h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">
            <span className="text-neutral-500">{lang === 'en' ? 'Logged in Audit Records:' : 'Tercatat di Audit:'}</span> {payrollHistory.length} {lang === 'en' ? 'Disbursements' : 'Transfer'}
          </p>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EMPLOYEE DIRECTORY & PAYROLL PROCESSING */}
      {/* ========================================================================= */}
      {hrTab === 'directory' && (
        <div className="space-y-3">
          {/* Quick Filter Control Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
              <Filter className="w-3.5 h-3.5" />
              <span>{lang === 'en' ? 'Filter by Payroll Status:' : 'Filter Status Payroll:'}</span>
            </div>
            
            <div className="flex items-center gap-1.5 bg-neutral-200/60 dark:bg-neutral-800/80 p-1 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => { setPayrollFilter('all'); setPage(1); }}
                className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  payrollFilter === 'all'
                    ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs font-semibold'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {lang === 'en' ? 'All Personnel' : 'Semua Pegawai'} ({employees.length})
              </button>
              <button
                type="button"
                onClick={() => { setPayrollFilter('pending'); setPage(1); }}
                className={`flex items-center gap-1 px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  payrollFilter === 'pending'
                    ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 font-semibold shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Clock className="w-3 h-3 text-amber-600" />
                <span>{lang === 'en' ? 'Needs Payroll' : 'Perlu Gaji'} ({pendingEmployeesCount})</span>
              </button>
              <button
                type="button"
                onClick={() => { setPayrollFilter('disbursed'); setPage(1); }}
                className={`flex items-center gap-1 px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                  payrollFilter === 'disbursed'
                    ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200 font-semibold shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>{lang === 'en' ? 'Already Disbursed' : 'Sudah Digaji (Lunas)'} ({disbursedEmployeesCount})</span>
              </button>
            </div>
          </div>

          <TableWrapper 
            title={activeT.hr.tableTitle} 
            placeholder={activeT.hr.searchPlaceholder}
            searchValue={search}
            onSearchChange={(v: string) => { setSearch(v); setPage(1); }}
            onExport={handleExport}
            isExporting={isExporting}
            currentPage={page}
            totalPages={totalPages || 1}
            onPageChange={setPage}
          >
            <thead>
              <Tr>
                <Th sortable onSort={() => handleSort('id')}>{activeT.hr.empIdCol}</Th>
                <Th sortable onSort={() => handleSort('name')}>{activeT.hr.empNameCol}</Th>
                <Th sortable onSort={() => handleSort('dept')}>{activeT.hr.deptCol}</Th>
                <Th sortable onSort={() => handleSort('role')}>{activeT.hr.roleCol}</Th>
                <Th>{lang === 'en' ? 'Payroll Status (Sep 2026)' : 'Status Payroll (Sep 2026)'}</Th>
                <Th sortable onSort={() => handleSort('status')}>{activeT.hr.statusCol}</Th>
                <Th align="right">{activeT.hr.actionCol}</Th>
              </Tr>
            </thead>
            <tbody>
              {paginatedEmployees.length > 0 ? (
                paginatedEmployees.map((emp, idx) => {
                  const isDisbursed = emp.salary?.disbursementStatus === 'Disbursed';

                  return (
                    <Tr key={emp.id} index={idx}>
                      <Td><span className="font-mono text-xs text-[#666] dark:text-[#a1a1aa]">{emp.id}</span></Td>
                      <Td>
                        <div className="font-medium tracking-tight text-neutral-900 dark:text-neutral-100">{emp.name}</div>
                        <div className="text-xs text-[#666] dark:text-[#a1a1aa] mt-0.5">{emp.email}</div>
                      </Td>
                      <Td><span className="font-medium text-xs">{emp.dept}</span></Td>
                      <Td><span className="text-xs text-neutral-700 dark:text-neutral-300">{emp.role}</span></Td>
                      
                      {/* Live Payroll Status Column */}
                      <Td>
                        {isDisbursed ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{lang === 'en' ? 'Disbursed (Lunas)' : 'Sudah Ditransfer'}</span>
                            </span>
                            <span className="block text-[10px] text-neutral-400 font-mono mt-0.5">
                              {emp.salary?.lastDisbursed || '25 Aug 2026'}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>{lang === 'en' ? 'Needs Processing' : 'Perlu Diproses'}</span>
                            </span>
                            <span className="block text-[10px] text-neutral-400 mt-0.5">
                              {lang === 'en' ? 'Due Sep 25' : 'Jadwal: 25 Sep'}
                            </span>
                          </div>
                        )}
                      </Td>

                      <Td><Badge color={emp.color}>{emp.status}</Badge></Td>
                      
                      <Td align="right">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          <Button 
                            variant="secondary" 
                            onClick={() => handleOnboardToCalendar(emp)}
                            title={lang === 'en' ? 'Sync onboarding to Google Calendar' : 'Sinkron jadwal onboarding ke Google Calendar'}
                          >
                            {activeT.hr.scheduleOnboardBtn}
                          </Button>
                          <Button 
                            variant="secondary" 
                            onClick={() => setActiveProfile(emp)}
                            title={lang === 'en' ? 'View employee profile' : 'Lihat profil pegawai'}
                          >
                            {activeT.hr.profileBtn}
                          </Button>
                          
                          {/* Distinct Action based on Disbursement Status */}
                          {isDisbursed ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setActivePayrollEmployee(emp)}
                                className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg border border-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer flex items-center gap-1"
                                title={lang === 'en' ? 'View payroll receipt & details' : 'Lihat bukti transfer & rincian gaji'}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{lang === 'en' ? 'Disbursed' : 'Lunas'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadPayslip(emp)}
                                className="p-1.5 text-neutral-500 hover:text-neutral-800 dark:hover:text-white rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                                title={lang === 'en' ? 'Download Payslip PDF' : 'Unduh Slip Gaji PDF'}
                              >
                                <Download className="w-3.5 h-3.5 text-[#0070f3]" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActivePayrollEmployee(emp)}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0070f3] hover:bg-[#0060df] rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                              title={lang === 'en' ? 'Process and disburse salary' : 'Proses dan transfer gaji'}
                            >
                              <CreditCard className="w-3.5 h-3.5 text-white" />
                              <span>{lang === 'en' ? 'Process Payroll' : 'Proses Gaji'}</span>
                            </button>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#666] dark:text-[#a1a1aa] text-sm">
                    {activeT.hr.noEmployees}
                  </td>
                </tr>
              )}
            </tbody>
          </TableWrapper>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PAYROLL DISBURSEMENT HISTORY & AUDIT LOG */}
      {/* ========================================================================= */}
      {hrTab === 'history' && (
        <div className="space-y-4">
          <TableWrapper 
            title={lang === 'en' ? "Payroll Disbursement History & Bank Audit" : "Riwayat Pencairan Gaji & Audit Bank"} 
            placeholder={lang === 'en' ? "Search reference number, employee name, ID..." : "Cari no referensi, nama pegawai, ID..."}
            searchValue={historySearch}
            onSearchChange={(v: string) => { setHistorySearch(v); setHistoryPage(1); }}
            onExport={handleExportHistory}
            isExporting={isExportingHistory}
            currentPage={historyPage}
            totalPages={totalHistoryPages || 1}
            onPageChange={setHistoryPage}
          >
            <thead>
              <Tr>
                <Th>{lang === 'en' ? 'Reference Number' : 'No. Referensi'}</Th>
                <Th>{lang === 'en' ? 'Employee' : 'Nama Pegawai'}</Th>
                <Th>{lang === 'en' ? 'Period' : 'Periode'}</Th>
                <Th>{lang === 'en' ? 'Disbursed Date & Time' : 'Tanggal & Waktu Transfer'}</Th>
                <Th>{lang === 'en' ? 'Take-Home Pay' : 'Gaji Bersih Ditransfer'}</Th>
                <Th>{lang === 'en' ? 'Target Account' : 'Rekening Tujuan'}</Th>
                <Th>{lang === 'en' ? 'Audit Status' : 'Status Audit'}</Th>
                <Th align="right">{lang === 'en' ? 'Action' : 'Aksi'}</Th>
              </Tr>
            </thead>
            <tbody>
              {paginatedHistory.length > 0 ? (
                paginatedHistory.map((rec, idx) => (
                  <Tr key={rec.id} index={idx}>
                    <Td>
                      <span className="font-mono text-xs font-semibold text-[#0070f3] dark:text-[#3291ff]">
                        {rec.referenceNumber}
                      </span>
                    </Td>
                    <Td>
                      <div className="font-medium text-xs text-neutral-900 dark:text-neutral-100">{rec.empName}</div>
                      <div className="text-[11px] text-neutral-400 font-mono">{rec.empId} • {rec.dept}</div>
                    </Td>
                    <Td>
                      <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        {rec.period}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs text-neutral-600 dark:text-neutral-400 font-mono">
                        {rec.disbursedDateFormatted}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        Rp {rec.netPay.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}
                      </span>
                    </Td>
                    <Td>
                      <div className="text-xs text-neutral-800 dark:text-neutral-200">{rec.bankName}</div>
                      <div className="text-[11px] font-mono text-neutral-400">{rec.accountNumber}</div>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>{lang === 'en' ? 'Disbursed' : 'Berhasil'}</span>
                      </span>
                    </Td>
                    <Td align="right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDownloadPayslipFromHistory(rec)}
                          className="px-2.5 py-1 text-xs text-[#0070f3] dark:text-[#3291ff] hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded border border-blue-200 dark:border-blue-900/60 flex items-center gap-1 font-semibold cursor-pointer transition-colors"
                          title={lang === 'en' ? 'Download official payslip PDF' : 'Unduh slip gaji PDF'}
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{lang === 'en' ? 'Payslip' : 'Slip Gaji'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveHistoryDetail(rec)}
                          className="p-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-white rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          title={lang === 'en' ? 'View transfer details' : 'Lihat rincian bukti transfer'}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </Td>
                  </Tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#666] dark:text-[#a1a1aa] text-sm">
                    {lang === 'en' ? "No payroll disbursement records found." : "Belum ada riwayat pencairan gaji yang tercatat."}
                  </td>
                </tr>
              )}
            </tbody>
          </TableWrapper>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: Employee General Profile */}
      {/* ========================================================================= */}
      <Modal 
        isOpen={activeProfile !== null} 
        onClose={() => setActiveProfile(null)} 
        title={lang === 'en' ? "Employee Profile" : "Profil Karyawan"}
      >
        {activeProfile && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-[#eaeaea] dark:border-[#333]">
              <div className="w-16 h-16 rounded-full bg-[#f0f0f0] dark:bg-[#222] text-[#999] flex items-center justify-center text-2xl font-semibold shadow-inner">
                {activeProfile.name.charAt(0)}
              </div>
              <div>
                <h4 className="text-xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">{activeProfile.name}</h4>
                <p className="text-sm text-[#666] dark:text-[#a1a1aa]">{activeProfile.role}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge color={activeProfile.color}>{activeProfile.status}</Badge>
                  {activeProfile.salary?.disbursementStatus === 'Disbursed' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      {lang === 'en' ? 'Payroll Disbursed' : 'Gaji Lunas'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                      <Clock className="w-3 h-3" />
                      {lang === 'en' ? 'Needs Payroll' : 'Belum Digaji'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1">{activeT.hr.empIdCol}</p>
                <p className="font-mono text-[#171717] dark:text-[#ededed]">{activeProfile.id}</p>
              </div>
              <div>
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1">{activeT.hr.deptCol}</p>
                <p className="font-medium text-[#171717] dark:text-[#ededed]">{activeProfile.dept}</p>
              </div>
              <div>
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1">{lang === 'en' ? 'Work Email' : 'Email Kantor'}</p>
                <p className="font-medium text-[#171717] dark:text-[#ededed]">{activeProfile.email}</p>
              </div>
              <div>
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1">{lang === 'en' ? 'Date Joined' : 'Mulai Bergabung'}</p>
                <p className="font-medium text-[#171717] dark:text-[#ededed]">{activeProfile.joined}</p>
              </div>
              <div>
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1">{lang === 'en' ? 'Tax ID / NPWP' : 'NPWP Terdaftar'}</p>
                <p className="font-mono text-xs text-[#171717] dark:text-[#ededed]">{activeProfile.taxId || '31.428.190.2-014.000'}</p>
              </div>
              <div>
                <p className="text-[#666] dark:text-[#a1a1aa] mb-1">{lang === 'en' ? 'Monthly Base' : 'Gaji Pokok'}</p>
                <p className="font-semibold text-[#171717] dark:text-[#ededed]">
                  Rp {(activeProfile.salary?.baseSalary || 0).toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-between items-center pt-4 border-t border-[#eaeaea] dark:border-[#333]">
              <Button variant="secondary" onClick={() => setActiveProfile(null)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span>{lang === 'en' ? 'Back' : 'Kembali'}</span>
              </Button>
              <Button 
                variant="primary" 
                onClick={() => {
                  const targetEmp = activeProfile;
                  setActiveProfile(null);
                  setActivePayrollEmployee(targetEmp);
                }}
              >
                <CreditCard className="w-4 h-4 mr-1.5" />
                <span>{activeT.hr.managePayrollBtn}</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: Interactive Manage Payroll & Compensation Breakdown */}
      {/* ========================================================================= */}
      <Modal
        isOpen={activePayrollEmployee !== null}
        onClose={() => setActivePayrollEmployee(null)}
        title={lang === 'en' ? `Compensation & Payroll Management - ${activePayrollEmployee?.name}` : `Pengelolaan Payroll & Kompensasi - ${activePayrollEmployee?.name}`}
      >
        {activePayrollEmployee && (() => {
          const calc = calculatePayroll(activePayrollEmployee, editableBonus);
          const s = activePayrollEmployee.salary;
          const isPaid = s?.disbursementStatus === 'Disbursed';

          return (
            <div className="space-y-5 text-sm">
              {/* Back button header bar */}
              <div className="flex items-center justify-between pb-3 border-b border-[#eaeaea] dark:border-[#262626]">
                <button
                  type="button"
                  onClick={() => {
                    const returnToProfile = activePayrollEmployee;
                    setActivePayrollEmployee(null);
                    setActiveProfile(returnToProfile);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#666] dark:text-[#a1a1aa] hover:text-[#171717] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Back to Profile' : 'Kembali ke Profil'}</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                    isPaid 
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                  }`}>
                    {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    <span>
                      {isPaid 
                        ? (lang === 'en' ? `Disbursed for Sep 2026 (${s.lastDisbursed || '25 Aug'})` : `Sudah Ditransfer (${s.lastDisbursed || '25 Agu'})`) 
                        : (lang === 'en' ? 'Scheduled for 25 Sep' : 'Dijadwalkan 25 Sep')}
                    </span>
                  </span>
                </div>
              </div>

              {/* Already Disbursed Information Banner */}
              {isPaid && (
                <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      {lang === 'en' ? 'Payroll Already Disbursed' : 'Gaji Sudah Berhasil Ditransfer'}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      {s.disbursementRef || 'TRX-PAY-202608-8831'}
                    </span>
                  </div>
                  <p className="text-emerald-700 dark:text-emerald-400 text-[11px] leading-relaxed">
                    {lang === 'en' 
                      ? `This employee's salary of Rp ${calc.netPay.toLocaleString('en-US')} was disbursed on ${s.lastDisbursed || '25 Aug 2026'}. The official payslip is available below. Duplicate transfers are locked to prevent double disbursement.`
                      : `Gaji karyawan ini sebesar Rp ${calc.netPay.toLocaleString('id-ID')} telah ditransfer pada ${s.lastDisbursed || '25 Agu 2026'}. Slip gaji resmi tersedia di bawah. Tombol transfer dikunci untuk mencegah duplikasi transfer.`}
                  </p>
                </div>
              )}

              {/* Employee Quick Identity */}
              <div className="bg-neutral-50 dark:bg-[#161616] p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">{activePayrollEmployee.name}</h4>
                  <p className="text-xs text-neutral-500">{activePayrollEmployee.role} • {activePayrollEmployee.dept}</p>
                  <p className="text-[11px] font-mono text-neutral-400 mt-0.5">NPWP: {activePayrollEmployee.taxId || '31.428.190.2-014.000'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-neutral-500 uppercase tracking-wider font-semibold">{lang === 'en' ? 'Payroll Period' : 'Periode Gaji'}</p>
                  <p className="font-medium text-xs text-neutral-800 dark:text-neutral-200">September 2026</p>
                  <p className="text-[11px] text-neutral-400 font-mono">Ref: {s.disbursementRef || `PAY/${activePayrollEmployee.id}`}</p>
                </div>
              </div>

              {/* Earnings & Allowances Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#0070f3]" />
                    <span>{lang === 'en' ? '1. Gross Earnings & Allowances' : '1. Pendapatan & Tunjangan'}</span>
                  </h5>
                  <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                    Rp {calc.gross.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}
                  </span>
                </div>
                
                <div className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400">{lang === 'en' ? 'Basic Salary' : 'Gaji Pokok'}</span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">Rp {calc.base.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400">{lang === 'en' ? 'Position / Functional Allowance' : 'Tunjangan Jabatan / Fungsional'}</span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">Rp {calc.pos.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400">{lang === 'en' ? 'Transport & Communication' : 'Tunjangan Transport & Komunikasi'}</span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">Rp {calc.trans.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <label className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                      <span>{lang === 'en' ? 'Performance Bonus / Overtime (Adjustable):' : 'Bonus Kinerja / Lembur (Bisa Diubah):'}</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-neutral-400 text-xs">Rp</span>
                      <input
                        type="number"
                        min="0"
                        step="100000"
                        disabled={isPaid && !allowReDisburse}
                        value={editableBonus}
                        onChange={(e) => setEditableBonus(Math.max(0, Number(e.target.value) || 0))}
                        className="w-28 px-2 py-1 text-right text-xs bg-neutral-100 dark:bg-[#1a1a1a] border border-neutral-300 dark:border-neutral-700 rounded font-medium text-neutral-900 dark:text-white focus:outline-hidden focus:border-[#0070f3] disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Statutory Deductions & Tax */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-rose-500" />
                    <span>{lang === 'en' ? '2. Deductions & Statutory Taxes' : '2. Potongan Resmi & Pajak'}</span>
                  </h5>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    - Rp {calc.totalDeductions.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}
                  </span>
                </div>

                <div className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-lg p-3 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600 dark:text-neutral-400">{lang === 'en' ? 'Income Tax Withholding (PPh 21 TER)' : 'PPh 21 Terutang (Skema TER)'}</span>
                    <span className="font-medium text-rose-600 dark:text-rose-400 tabular-nums">- Rp {calc.pph21.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600 dark:text-neutral-400">{lang === 'en' ? 'BPJS Ketenagakerjaan (JHT 2% + JP 1%)' : 'BPJS Ketenagakerjaan (3% Karyawan)'}</span>
                    <span className="font-medium text-rose-600 dark:text-rose-400 tabular-nums">- Rp {calc.bpjsTk.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-600 dark:text-neutral-400">{lang === 'en' ? 'BPJS Kesehatan (1% Employee Contribution)' : 'BPJS Kesehatan (1% Karyawan)'}</span>
                    <span className="font-medium text-rose-600 dark:text-rose-400 tabular-nums">- Rp {calc.bpjsKes.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Net Take-Home Pay Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider font-semibold opacity-90">
                      {lang === 'en' ? 'Net Take-Home Pay' : 'Gaji Bersih Diterima (Take-Home Pay)'}
                    </p>
                    <p className="text-2xl font-bold tracking-tight mt-0.5 tabular-nums">
                      Rp {calc.netPay.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] opacity-80">{lang === 'en' ? 'Target Account' : 'Rekening Payroll'}</p>
                    <p className="font-semibold text-xs mt-0.5">{s?.bankName}</p>
                    <p className="font-mono text-xs opacity-90">{s?.accountNumber}</p>
                  </div>
                </div>
              </div>

              {/* Bottom Actions & Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setActivePayrollEmployee(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Back' : 'Kembali'}</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleDownloadPayslip(activePayrollEmployee)}
                    className="px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer border border-neutral-200 dark:border-neutral-700"
                    title={lang === 'en' ? 'Download official payslip PDF' : 'Unduh slip gaji PDF resmi'}
                  >
                    <Download className="w-3.5 h-3.5 text-[#0070f3]" />
                    <span>{lang === 'en' ? 'Payslip PDF' : 'Slip Gaji PDF'}</span>
                  </button>

                  {/* Disbursement Button: Protected if already paid */}
                  {isPaid && !allowReDisburse ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAllowReDisburse(true)}
                        className="px-2.5 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:underline cursor-pointer"
                        title={lang === 'en' ? 'Unlock to adjust bonus and re-transfer' : 'Buka kunci untuk ubah bonus dan transfer ulang'}
                      >
                        {lang === 'en' ? 'Adjust / Re-transfer' : 'Koreksi Gaji'}
                      </button>
                      <button
                        type="button"
                        disabled
                        className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-not-allowed opacity-90 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{lang === 'en' ? 'Already Disbursed' : 'Sudah Ditransfer'}</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isDisbursing}
                      onClick={() => handleDisbursePayroll(activePayrollEmployee)}
                      className="px-4 py-2 bg-[#171717] hover:bg-[#2b2b2b] dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {isDisbursing 
                          ? (lang === 'en' ? 'Transferring...' : 'Memproses Transfer...') 
                          : allowReDisburse
                          ? (lang === 'en' ? 'Confirm Re-transfer' : 'Konfirmasi Transfer Ulang')
                          : (lang === 'en' ? 'Disburse via Bank' : 'Transfer Gaji')}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: History Record Detail / Audit Receipt */}
      {/* ========================================================================= */}
      <Modal
        isOpen={activeHistoryDetail !== null}
        onClose={() => setActiveHistoryDetail(null)}
        title={lang === 'en' ? `Disbursement Audit Receipt - ${activeHistoryDetail?.referenceNumber}` : `Bukti Audit Transfer Gaji - ${activeHistoryDetail?.referenceNumber}`}
      >
        {activeHistoryDetail && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-xs text-[#0070f3]">
                  {activeHistoryDetail.referenceNumber}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {lang === 'en' ? 'Disbursed to Bank' : 'Berhasil Ditransfer'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-neutral-600 dark:text-neutral-400 pt-1">
                <div>
                  <span className="block text-[10px] text-neutral-400">{lang === 'en' ? 'Employee Name:' : 'Nama Pegawai:'}</span>
                  <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-xs">{activeHistoryDetail.empName}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-neutral-400">{lang === 'en' ? 'Employee ID & Dept:' : 'ID & Departemen:'}</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200">{activeHistoryDetail.empId} ({activeHistoryDetail.dept})</span>
                </div>
                <div>
                  <span className="block text-[10px] text-neutral-400">{lang === 'en' ? 'Transfer Date & Time:' : 'Waktu Transfer:'}</span>
                  <span className="font-mono text-neutral-800 dark:text-neutral-200">{activeHistoryDetail.disbursedDateFormatted}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-neutral-400">{lang === 'en' ? 'Processed By:' : 'Disetujui Oleh:'}</span>
                  <span className="text-neutral-800 dark:text-neutral-200">{activeHistoryDetail.actor}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#121212] border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500">{lang === 'en' ? 'Basic Salary:' : 'Gaji Pokok:'}</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">Rp {activeHistoryDetail.baseSalary.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">{lang === 'en' ? 'Allowances (Position & Transport):' : 'Tunjangan (Jabatan & Transport):'}</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">Rp {activeHistoryDetail.allowances.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}</span>
              </div>
              {activeHistoryDetail.bonus > 0 && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">{lang === 'en' ? 'Bonus & Overtime:' : 'Bonus & Lembur:'}</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">Rp {activeHistoryDetail.bonus.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-1 border-t border-neutral-100 dark:border-neutral-800">
                <span className="text-neutral-700 dark:text-neutral-300">{lang === 'en' ? 'Gross Earnings:' : 'Pendapatan Kotor:'}</span>
                <span className="tabular-nums">Rp {activeHistoryDetail.gross.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}</span>
              </div>
              <div className="flex justify-between text-rose-600 dark:text-rose-400 pt-1">
                <span>{lang === 'en' ? 'Deductions (PPh 21 & BPJS):' : 'Potongan (PPh 21 & BPJS):'}</span>
                <span className="tabular-nums">- Rp {activeHistoryDetail.deductions.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-2 border-t border-neutral-200 dark:border-neutral-800 text-emerald-600 dark:text-emerald-400">
                <span>{lang === 'en' ? 'Net Take-Home Pay Disbursed:' : 'Total Gaji Bersih Ditransfer:'}</span>
                <span className="tabular-nums">Rp {activeHistoryDetail.netPay.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="secondary" onClick={() => setActiveHistoryDetail(null)}>
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                <span>{lang === 'en' ? 'Close' : 'Tutup'}</span>
              </Button>
              <Button variant="primary" onClick={() => handleDownloadPayslipFromHistory(activeHistoryDetail)}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                <span>{lang === 'en' ? 'Download Official Payslip PDF' : 'Unduh Slip Gaji PDF Resmi'}</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

export default HRView;
