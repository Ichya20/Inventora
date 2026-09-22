import React, { useState, useMemo } from 'react';
import { Card, Badge, Button, TableWrapper, Th, Td, Tr, Modal } from './UI';
import { ToastType } from '../types';
import { translations, Language, Translations } from '../i18n';
import { useDebounce } from '../lib/useDebounce';

interface HRViewProps {
  onToast: (msg: string, type?: ToastType) => void;
  t?: Translations;
  lang?: Language;
}

export function HRView({ onToast, t, lang = 'en' }: HRViewProps) {
  const activeT = t || translations[lang] || translations.en;

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 180);

  const [employees] = useState([
    { id: 'EMP-10024', name: 'Budi Santoso', email: 'budi.s@inventora.com', dept: 'Engineering', role: 'Senior AI Engineer', status: lang === 'en' ? 'Active' : 'Aktif', color: 'green' as const, joined: '12 Jan 2022' },
    { id: 'EMP-10088', name: 'Siti Rahmawati', email: 'siti.r@inventora.com', dept: 'Finance', role: 'Financial Controller', status: lang === 'en' ? 'Annual Leave' : 'Cuti Tahunan', color: 'gray' as const, joined: '04 Mar 2023' },
    { id: 'EMP-10091', name: 'Andi Wijaya', email: 'andi.w@inventora.com', dept: 'Operations', role: 'Ops Manager', status: lang === 'en' ? 'Active' : 'Aktif', color: 'green' as const, joined: '15 Aug 2021' },
    { id: 'EMP-10105', name: 'Rina Kusuma', email: 'rina.k@inventora.com', dept: 'HR', role: 'HR Specialist', status: lang === 'en' ? 'Sick Leave' : 'Sakit', color: 'red' as const, joined: '10 Feb 2024' },
    { id: 'EMP-10112', name: 'Joko Anwar', email: 'joko.a@inventora.com', dept: 'Engineering', role: 'Backend Engineer', status: lang === 'en' ? 'Active' : 'Aktif', color: 'green' as const, joined: '01 Nov 2023' },
  ]);

  const [activeProfile, setActiveProfile] = useState<any | null>(null);

  const [page, setPage] = useState(1);
  const itemsPerPage = 4;
  const [sortConfig, setSortConfig] = useState<{ key: keyof typeof employees[0], direction: 'asc' | 'desc' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleSort = (key: keyof typeof employees[0]) => {
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
    return sortedEmployees.filter(emp => 
      emp.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
      emp.id.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [sortedEmployees, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / itemsPerPage));
  const paginatedEmployees = useMemo(() => {
    return filteredEmployees.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  }, [filteredEmployees, page, itemsPerPage]);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      onToast(lang === 'en' ? "Employee directory exported as CSV" : "Direktori pegawai berhasil diekspor sebagai CSV", "success");
    }, 1200);
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

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">
            {activeT.hr.totalEmployees}
          </p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">342</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">
            <span className="text-[#0070f3] dark:text-[#3291ff] font-medium">+15 {lang === 'en' ? 'Recruits' : 'Rekrutmen'}</span> {activeT.hr.newHiresMonth}
          </p>
        </Card>
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">
            {activeT.hr.payrollEstimate}
          </p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">
            {lang === 'en' ? 'Rp 4.8B' : 'Rp 4,8 M'}
          </h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">{activeT.hr.disbursementDate}</p>
        </Card>
        <Card>
          <p className="text-[#666] dark:text-[#a1a1aa] text-sm font-medium tracking-tight">
            {activeT.hr.pendingLeaves}
          </p>
          <h3 className="text-3xl font-semibold tracking-tighter mt-1 text-[#171717] dark:text-[#ededed] tabular-nums">8</h3>
          <p className="text-[#666] dark:text-[#a1a1aa] text-xs mt-2">
            <span className="text-[#f5a623] font-medium">{activeT.hr.waitingManager}</span>
          </p>
        </Card>
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
        <thead className="sticky top-0 z-10">
          <tr>
            <Th sortable onSort={() => handleSort('id')}>{activeT.hr.empIdCol}</Th>
            <Th sortable onSort={() => handleSort('name')}>{activeT.hr.empNameCol}</Th>
            <Th sortable onSort={() => handleSort('dept')}>{activeT.hr.deptCol}</Th>
            <Th sortable onSort={() => handleSort('role')}>{activeT.hr.roleCol}</Th>
            <Th sortable onSort={() => handleSort('status')}>{activeT.hr.statusCol}</Th>
            <Th align="right">{activeT.hr.actionCol}</Th>
          </tr>
        </thead>
        <tbody>
          {paginatedEmployees.length > 0 ? (
            paginatedEmployees.map((emp, idx) => (
              <Tr key={emp.id} index={idx}>
                <Td><span className="font-mono text-xs text-[#666] dark:text-[#a1a1aa]">{emp.id}</span></Td>
                <Td>
                  <div className="font-medium tracking-tight">{emp.name}</div>
                  <div className="text-xs text-[#666] dark:text-[#a1a1aa] mt-0.5">{emp.email}</div>
                </Td>
                <Td>{emp.dept}</Td>
                <Td>{emp.role}</Td>
                <Td><Badge color={emp.color}>{emp.status}</Badge></Td>
                <Td align="right">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => handleOnboardToCalendar(emp)}>
                      {activeT.hr.scheduleOnboardBtn}
                    </Button>
                    <Button variant="secondary" onClick={() => setActiveProfile(emp)}>
                      {activeT.hr.profileBtn}
                    </Button>
                  </div>
                </Td>
              </Tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-[#666] dark:text-[#a1a1aa] text-sm">
                {activeT.hr.noEmployees}
              </td>
            </tr>
          )}
        </tbody>
      </TableWrapper>

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
                <div className="mt-1">
                  <Badge color={activeProfile.color}>{activeProfile.status}</Badge>
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
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-[#eaeaea] dark:border-[#333]">
              <Button variant="secondary" onClick={() => setActiveProfile(null)}>
                {activeT.common.close}
              </Button>
              <Button variant="primary" onClick={() => {
                onToast(lang === 'en' ? `Accessing payroll settings for ${activeProfile.name}...` : `Membuka pengaturan gaji untuk ${activeProfile.name}...`);
                setActiveProfile(null);
              }}>
                {activeT.hr.managePayrollBtn}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
export default HRView;
