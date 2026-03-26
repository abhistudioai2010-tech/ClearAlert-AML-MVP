import React, { useState, useMemo } from 'react';

export default function ResultsView({ results, onReset }) {
  const [activeTab, setActiveTab] = useState('critical');
  const [copiedId, setCopiedId] = useState(null);
  const { critical_alerts, archived_alerts, justification_log, summary } = results;

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* fallback: noop */ }
  };

  const copyAllCritical = () => {
    const text = critical_alerts.map((a) =>
      `${a.alert_id} | ${a.customer_name} | $${a.transaction_amount.toLocaleString()} | ${a.alert_type} | Risk: ${(a.risk_score * 100).toFixed(0)}%`
    ).join('\n');
    copyToClipboard(`CRITICAL ALERTS FOR REVIEW\n${'─'.repeat(50)}\n${text}`, 'all-critical');
  };

  const copyJustificationLog = () => {
    const text = justification_log.map((j) =>
      `[${j.alert_id}] ${j.customer_name}\n  Justification: ${j.justification}\n  Confidence: ${(j.confidence * 100).toFixed(0)}%`
    ).join('\n\n');
    copyToClipboard(`JUSTIFICATION LOG — AUTO-ARCHIVED ALERTS\n${'─'.repeat(50)}\n\n${text}`, 'all-justification');
  };

  return (
    <div className="w-full max-w-6xl animate-fade-in space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard label="Total Alerts" value={summary.total_alerts} color="slate" />
        <SummaryCard label="Critical" value={summary.critical_count} color="red" icon="🔴" />
        <SummaryCard label="Auto-Archived" value={summary.archived_count} color="emerald" icon="🟢" />
        <SummaryCard label="False Positive Rate" value={`${summary.false_positive_rate}%`} color="cyan" icon="📊" />
      </div>

      {/* Tabs */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex border-b border-slate-700/50">
          <TabButton
            active={activeTab === 'critical'}
            onClick={() => setActiveTab('critical')}
            label="Critical Alerts for Review"
            count={critical_alerts.length}
            color="red"
          />
          <TabButton
            active={activeTab === 'archived'}
            onClick={() => setActiveTab('archived')}
            label="Auto-Archived Alerts"
            count={archived_alerts.length}
            color="emerald"
          />
          <TabButton
            active={activeTab === 'justification'}
            onClick={() => setActiveTab('justification')}
            label="Justification Log"
            count={justification_log.length}
            color="violet"
          />

          {/* Copy Buttons */}
          <div className="ml-auto flex items-center gap-2 pr-4">
            {activeTab === 'critical' && (
              <CopyButton onClick={copyAllCritical} copied={copiedId === 'all-critical'} label="Copy All Critical" />
            )}
            {activeTab === 'justification' && (
              <CopyButton onClick={copyJustificationLog} copied={copiedId === 'all-justification'} label="Export Log" />
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 max-h-[520px] overflow-y-auto">
          {activeTab === 'critical' && <CriticalTable alerts={critical_alerts} />}
          {activeTab === 'archived' && <ArchivedTable alerts={archived_alerts} />}
          {activeTab === 'justification' && <JustificationList log={justification_log} />}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center">
        <button onClick={onReset} className="px-5 py-2 text-sm glass rounded-xl hover:bg-surface-700/50 text-slate-400 hover:text-slate-200 transition-all">
          ← Analyze Another File
        </button>
        <p className="text-xs text-slate-600">All processing performed locally · No data transmitted</p>
      </div>
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────

function SummaryCard({ label, value, color, icon }) {
  const colorMap = {
    slate: 'text-slate-100',
    red: 'text-red-400',
    emerald: 'text-emerald-400',
    cyan: 'text-accent-cyan',
  };
  return (
    <div className="glass rounded-xl p-4 animate-slide-up">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <div className="flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        <span className={`text-2xl font-bold ${colorMap[color]}`}>{value}</span>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, label, count, color }) {
  const activeColors = { red: 'border-red-400 text-red-300', emerald: 'border-emerald-400 text-emerald-300', violet: 'border-violet-400 text-violet-300' };
  return (
    <button
      onClick={onClick}
      className={`px-5 py-3 text-sm font-medium border-b-2 transition-all ${
        active ? activeColors[color] : 'border-transparent text-slate-500 hover:text-slate-300'
      }`}
    >
      {label}
      <span className={`ml-2 px-1.5 py-0.5 text-[10px] rounded-full ${active ? 'bg-slate-700' : 'bg-surface-700'}`}>
        {count}
      </span>
    </button>
  );
}

function CopyButton({ onClick, copied, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
        copied
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-surface-700/80 text-slate-300 hover:bg-surface-600 border border-slate-700'
      }`}
    >
      {copied ? '✓ Copied!' : label}
    </button>
  );
}

function CriticalTable({ alerts }) {
  if (!alerts.length) return <EmptyState text="No critical alerts identified." />;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
          <th className="pb-3 pr-4">Alert ID</th>
          <th className="pb-3 pr-4">Customer</th>
          <th className="pb-3 pr-4">Amount</th>
          <th className="pb-3 pr-4">Type</th>
          <th className="pb-3 pr-4">Route</th>
          <th className="pb-3 pr-4">Risk</th>
        </tr>
      </thead>
      <tbody>
        {alerts.map((a) => (
          <tr key={a.alert_id} className="border-t border-slate-800/50 hover:bg-surface-700/30 transition-colors">
            <td className="py-3 pr-4 font-mono text-red-400">{a.alert_id}</td>
            <td className="py-3 pr-4 text-slate-200 font-medium">{a.customer_name}</td>
            <td className="py-3 pr-4 text-slate-300">${a.transaction_amount.toLocaleString()}</td>
            <td className="py-3 pr-4"><span className="px-2 py-0.5 text-xs bg-red-500/10 text-red-300 rounded-full">{a.alert_type}</span></td>
            <td className="py-3 pr-4 text-xs text-slate-400">{a.source_country} → {a.destination_country}</td>
            <td className="py-3 pr-4">
              <RiskBadge score={a.risk_score} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ArchivedTable({ alerts }) {
  if (!alerts.length) return <EmptyState text="No auto-archived alerts." />;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-slate-500 uppercase tracking-wider">
          <th className="pb-3 pr-4">Alert ID</th>
          <th className="pb-3 pr-4">Customer</th>
          <th className="pb-3 pr-4">Amount</th>
          <th className="pb-3 pr-4">Type</th>
          <th className="pb-3 pr-4">Risk</th>
        </tr>
      </thead>
      <tbody>
        {alerts.map((a) => (
          <tr key={a.alert_id} className="border-t border-slate-800/50 hover:bg-surface-700/30 transition-colors">
            <td className="py-2.5 pr-4 font-mono text-slate-400">{a.alert_id}</td>
            <td className="py-2.5 pr-4 text-slate-300">{a.customer_name}</td>
            <td className="py-2.5 pr-4 text-slate-400">${a.transaction_amount.toLocaleString()}</td>
            <td className="py-2.5 pr-4 text-xs text-slate-500">{a.alert_type}</td>
            <td className="py-2.5 pr-4">
              <RiskBadge score={a.risk_score} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function JustificationList({ log }) {
  if (!log.length) return <EmptyState text="No justification entries." />;
  return (
    <div className="space-y-3">
      {log.map((j) => (
        <div key={j.alert_id} className="glass-light rounded-xl p-4 hover:bg-surface-700/40 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-accent-cyan">{j.alert_id}</span>
              <span className="text-slate-400 text-sm">·</span>
              <span className="text-sm text-slate-300">{j.customer_name}</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
              {(j.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed pl-1 border-l-2 border-emerald-500/30 ml-1">
            {j.justification}
          </p>
        </div>
      ))}
    </div>
  );
}

function RiskBadge({ score }) {
  const pct = (score * 100).toFixed(0);
  let cls = 'bg-emerald-500/10 text-emerald-400';
  if (score >= 0.8) cls = 'bg-red-500/15 text-red-400';
  else if (score >= 0.5) cls = 'bg-amber-500/10 text-amber-400';
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${cls}`}>{pct}%</span>;
}

function EmptyState({ text }) {
  return <p className="text-center py-12 text-slate-500 text-sm">{text}</p>;
}
