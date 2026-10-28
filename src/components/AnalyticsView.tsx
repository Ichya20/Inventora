import { authenticatedPost } from '../lib/apiClient';
import React, { useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { workspaceMotion } from '../lib/motion';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area 
} from 'recharts';
import { Sparkles, Download, Activity } from 'lucide-react';
import { Card, Button } from './UI';
import { translations, Language, Translations } from '../i18n';
import { CleanAiText } from './CleanAiText';
import { exportToCsv } from '../lib/exportUtils';

interface AnalyticsViewProps {
  t?: Translations;
  lang?: Language;
}

export function AnalyticsView({ t, lang = 'en' }: AnalyticsViewProps) {
  const reduced = useReducedMotion();
  const chartMotion = { isAnimationActive: !reduced, animationDuration: workspaceMotion.chart * 1000, animationBegin: 0, animationEasing: 'ease-out' as const };
  const activeT = t || translations[lang] || translations.en;
  const [isExporting, setIsExporting] = useState(false);

  const pieData = useMemo(() => [
    { name: lang === 'en' ? 'Engineering' : 'Teknik', value: 45 },
    { name: lang === 'en' ? 'Marketing' : 'Pemasaran', value: 25 },
    { name: lang === 'en' ? 'Operations' : 'Operasional', value: 20 },
    { name: lang === 'en' ? 'HR' : 'SDM', value: 10 },
  ], [lang]);
  const COLORS = ['#0070f3', '#10b981', '#f5a623', '#888888'];

  const barData = useMemo(() => [
    { name: 'NVIDIA', volume: 4000 },
    { name: 'Cisco', volume: 3000 },
    { name: 'Dell', volume: 2000 },
    { name: 'Lenovo', volume: 1500 },
  ], []);
  const cashFlowData = useMemo(() => [
    { name: 'Q1', in: 4000, out: 2400 },
    { name: 'Q2', in: 3000, out: 1398 },
    { name: 'Q3', in: 2000, out: 9800 },
    { name: 'Q4', in: 2780, out: 3908 },
  ], []);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const aiRequestPending = useRef(false);

  const handleExportReport = () => {
    setIsExporting(true);
    try {
      const headers = ['Category', 'Metric / Dimension', 'Value', 'Share (%)'];
      const rows: (string | number)[][] = [
        ...pieData.map(d => ['Department Budget Allocation', d.name, d.value, `${d.value}%`]),
        ...barData.map(d => ['Vendor Procurement Volume', d.name, d.volume, '-']),
        ['Cash Flow Analysis', 'Q1 Inflow', 4000, '-'],
        ['Cash Flow Analysis', 'Q2 Inflow', 3000, '-'],
        ['Cash Flow Analysis', 'Q3 Inflow', 2000, '-'],
        ['Cash Flow Analysis', 'Q4 Inflow', 2780, '-']
      ];
      exportToCsv(`inventora-financial-analytics-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    } finally {
      setTimeout(() => setIsExporting(false), 500);
    }
  };

  const handleAskAnalyst = async (customPrompt?: string) => {
    const promptToSend = customPrompt || aiPrompt;
    if (!promptToSend.trim() || aiRequestPending.current) return;
    aiRequestPending.current = true;
    setIsAiLoading(true);
    setAiAnalysis(null);
    setAiError(null);
    try {
      const data = await authenticatedPost<{ result?: string; error?: string }>('/api/analyst', {
        prompt: promptToSend, context: {
          dataSource: 'illustrative sample chart data, not recorded business transactions',
          departmentBudgets: pieData, vendorVolumes: barData,
          cashFlowSummary: { Q1_in: 4000, Q2_in: 3000, Q3_in: 2000, Q4_in: 2780 },
        },
      });
      if (data.result?.trim()) {
        setAiAnalysis(data.result);
      } else throw new Error(data.error || (lang === 'en' ? 'No analysis was returned. Try again.' : 'Hasil analisis belum tersedia. Coba lagi.'));
    } catch (err: any) {
      setAiError(err.message || (lang === 'en' ? 'Analysis could not be loaded.' : 'Analisis belum dapat dimuat.'));
    } finally {
      aiRequestPending.current = false;
      setIsAiLoading(false);
    }
  };

  const suggestions = [
    { label: lang === 'en' ? 'Budget summary' : 'Ringkasan anggaran', prompt: activeT.analytics.prompt1 },
    { label: lang === 'en' ? 'Vendor risk' : 'Risiko vendor', prompt: activeT.analytics.prompt2 },
    { label: lang === 'en' ? 'Cost savings' : 'Efisiensi biaya', prompt: activeT.analytics.prompt3 }
  ];

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">
            {activeT.analytics.title}
          </h2>
          <p className="text-sm text-[#666] dark:text-[#a1a1aa] mt-1">
            {lang === 'en' ? 'Example data · not recorded transactions' : 'Data contoh · bukan transaksi tercatat'}
          </p>
        </div>
        <Button variant="secondary" onClick={handleExportReport} isLoading={isExporting}>
          <Download className="w-4 h-4 mr-2 inline" /> {activeT.analytics.exportReport}
        </Button>
      </div>

      {/* AI Enterprise Analyst Panel */}
      <div className="bg-white dark:bg-[#111] p-6 rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-[#0070f3] dark:text-[#3291ff]" />
          <h3 className="font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">
            {lang === 'en' ? 'Ask the analyst' : 'Tanya analis'}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isAiLoading}
              onClick={() => {
                setAiPrompt(suggestion.prompt);
                handleAskAnalyst(suggestion.prompt);
              }}
              className="text-xs px-3 py-2 rounded-md bg-[#f4f4f5] dark:bg-[#222] text-[#555] dark:text-[#ccc] hover:bg-[#eaeaea] dark:hover:bg-[#333] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
            >
              {suggestion.label}
            </button>
          ))}
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleAskAnalyst();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            aria-label={lang === 'en' ? 'Analysis question' : 'Pertanyaan analisis'}
            placeholder={lang === 'en' ? 'Ask about this data…' : 'Tanyakan data ini…'}
            className="flex-1 min-w-0 bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] outline-none text-sm px-3.5 py-2 rounded-md placeholder-[#999] dark:placeholder-[#666] text-[#171717] dark:text-[#ededed] focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)]"
          />
          <Button type="submit" variant="primary" isLoading={isAiLoading} disabled={!aiPrompt.trim()}>
            {isAiLoading ? activeT.analytics.analyzingBtn : activeT.analytics.askAiBtn}
          </Button>
        </form>

        {aiError && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">{aiError}</p>}

        {aiAnalysis && (
          <div className="mt-4 p-4 rounded-lg bg-[#fafafa] dark:bg-[#161616] border border-[#eaeaea] dark:border-[#262626]">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#666] dark:text-[#888] mb-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#0070f3]" />
              {activeT.analytics.analysisResult}
            </div>
            <div className="text-xs text-[#171717] dark:text-[#ededed] leading-relaxed">
              <CleanAiText text={aiAnalysis} />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 shrink-0">
        <Card>
          <h3 className="font-semibold tracking-tight text-[#171717] dark:text-[#ededed] mb-6">
            {activeT.analytics.deptBudgetAllocation}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie {...chartMotion} data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold tracking-tight text-[#171717] dark:text-[#ededed] mb-6">
            {activeT.analytics.topVendors}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                <Bar {...chartMotion} dataKey="volume" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold tracking-tight text-[#171717] dark:text-[#ededed] mb-6">
            {activeT.analytics.cashFlowForecast}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <RechartsTooltip />
                <Area {...chartMotion} type="monotone" dataKey="in" stackId="1" stroke="#0070f3" fill="#0070f3" fillOpacity={0.2} />
                <Area {...chartMotion} type="monotone" dataKey="out" stackId="1" stroke="#f5a623" fill="#f5a623" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </section>
  );
}
export default AnalyticsView;
