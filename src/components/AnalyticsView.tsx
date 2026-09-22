import React, { useState } from 'react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area 
} from 'recharts';
import { Sparkles, Download, Activity } from 'lucide-react';
import { Card, Button } from './UI';
import { translations, Language, Translations } from '../i18n';

interface AnalyticsViewProps {
  t?: Translations;
  lang?: Language;
}

export function AnalyticsView({ t, lang = 'en' }: AnalyticsViewProps) {
  const activeT = t || translations[lang] || translations.en;

  const pieData = [
    { name: lang === 'en' ? 'Engineering' : 'Teknik', value: 45 },
    { name: lang === 'en' ? 'Marketing' : 'Pemasaran', value: 25 },
    { name: lang === 'en' ? 'Operations' : 'Operasional', value: 20 },
    { name: lang === 'en' ? 'HR' : 'SDM', value: 10 },
  ];
  const COLORS = ['#0070f3', '#10b981', '#f5a623', '#888888'];

  const barData = [
    { name: 'NVIDIA', volume: 4000 },
    { name: 'Cisco', volume: 3000 },
    { name: 'Dell', volume: 2000 },
    { name: 'Lenovo', volume: 1500 },
  ];

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const handleAskAnalyst = async (customPrompt?: string) => {
    const promptToSend = customPrompt || aiPrompt;
    if (!promptToSend.trim()) return;
    setIsAiLoading(true);
    setAiAnalysis(null);
    try {
      const res = await fetch('/api/analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          context: {
            departmentBudgets: pieData,
            vendorVolumes: barData,
            cashFlowSummary: { Q1_in: 4000, Q2_in: 3000, Q3_in: 2000, Q4_in: 2780 }
          }
        })
      });
      const data = await res.json();
      if (data.result) {
        setAiAnalysis(data.result);
      } else if (data.error) {
        setAiAnalysis(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setAiAnalysis(`Request failed: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const suggestions = [
    activeT.analytics.prompt1,
    activeT.analytics.prompt2,
    activeT.analytics.prompt3
  ];

  return (
    <section className="p-4 md:p-8 flex-1 flex flex-col gap-6 overflow-y-auto">
      <div className="flex items-center justify-between shrink-0 mb-2">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">
            {activeT.analytics.title}
          </h2>
          <p className="text-sm text-[#666] dark:text-[#a1a1aa] mt-1">
            {activeT.analytics.subtitle}
          </p>
        </div>
        <Button variant="secondary">
          <Download className="w-4 h-4 mr-2 inline" /> {activeT.analytics.exportReport}
        </Button>
      </div>

      {/* AI Enterprise Analyst Panel */}
      <div className="bg-white dark:bg-[#111] p-6 rounded-xl shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-[#0070f3] dark:text-[#3291ff]" />
          <h3 className="font-semibold tracking-tight text-[#171717] dark:text-[#ededed]">
            {activeT.analytics.aiTitle}
          </h3>
        </div>
        <p className="text-xs text-[#666] dark:text-[#a1a1aa] mb-4">
          {activeT.analytics.aiSubtitle}
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => {
                setAiPrompt(suggestion);
                handleAskAnalyst(suggestion);
              }}
              className="text-xs px-3 py-1.5 rounded-full bg-[#f4f4f5] dark:bg-[#222] text-[#555] dark:text-[#ccc] hover:bg-[#eaeaea] dark:hover:bg-[#333] transition-colors cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleAskAnalyst();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder={activeT.analytics.aiPlaceholder}
            className="flex-1 bg-white dark:bg-[#1a1a1a] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] outline-none text-sm px-3.5 py-2 rounded-md placeholder-[#999] dark:placeholder-[#666] text-[#171717] dark:text-[#ededed] focus:shadow-[0_0_0_1px_#0070f3,0_0_0_3px_rgba(0,112,243,0.24)]"
          />
          <Button type="submit" variant="primary" disabled={isAiLoading || !aiPrompt.trim()}>
            {isAiLoading ? activeT.analytics.analyzingBtn : activeT.analytics.askAiBtn}
          </Button>
        </form>

        {aiAnalysis && (
          <div className="mt-4 p-4 rounded-lg bg-[#fafafa] dark:bg-[#161616] border border-[#eaeaea] dark:border-[#262626]">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#666] dark:text-[#888] mb-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#0070f3]" />
              {activeT.analytics.analysisResult}
            </div>
            <div className="text-sm text-[#171717] dark:text-[#ededed] whitespace-pre-line leading-relaxed">
              {aiAnalysis}
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
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
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
                <Bar dataKey="volume" fill="#10b981" radius={[4, 4, 0, 0]} />
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
              <AreaChart data={[
                { name: 'Q1', in: 4000, out: 2400 },
                { name: 'Q2', in: 3000, out: 1398 },
                { name: 'Q3', in: 2000, out: 9800 },
                { name: 'Q4', in: 2780, out: 3908 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eaeaea" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <RechartsTooltip />
                <Area type="monotone" dataKey="in" stackId="1" stroke="#0070f3" fill="#0070f3" fillOpacity={0.2} />
                <Area type="monotone" dataKey="out" stackId="1" stroke="#f5a623" fill="#f5a623" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </section>
  );
}
export default AnalyticsView;
