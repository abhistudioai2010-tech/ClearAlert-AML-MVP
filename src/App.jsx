import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import FileUploader from './components/FileUploader';
import ProgressIndicator from './components/ProgressIndicator';
import ResultsView from './components/ResultsView';

const VIEWS = { UPLOAD: 'upload', PROCESSING: 'processing', RESULTS: 'results' };

export default function App() {
  const [view, setView] = useState(VIEWS.UPLOAD);
  const [progress, setProgress] = useState({ percent: 0, message: '' });
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState('');

  // Removed Electron IPC listeners
  const handleFileSelected = useCallback(async (file, name) => {
    setError(null);
    setFileName(name);
    setProgress({ percent: 10, message: 'Uploading file to ML engine...' });
    setView(VIEWS.PROCESSING);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Relative path works because of the Vite proxy in vite.config.js
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process file');
      }

      const data = await response.json();
      setResults(data);
      setView(VIEWS.RESULTS);
    } catch (err) {
      setError('Processing Error: ' + err.message);
      setView(VIEWS.UPLOAD);
    }
  }, []);

  const handleReset = useCallback(() => {
    setView(VIEWS.UPLOAD);
    setResults(null);
    setProgress({ percent: 0, message: '' });
    setError(null);
    setFileName('');
  }, []);

  // Demo simulation for browser-only development
  function simulateDemoProcessing() {
    const steps = [
      { percent: 10, message: 'Parsing file...' },
      { percent: 30, message: 'Loading ML model...' },
      { percent: 50, message: 'Scoring alerts...' },
      { percent: 70, message: 'Generating justification logs...' },
      { percent: 90, message: 'Finalizing results...' },
    ];

    steps.forEach((step, i) => {
      setTimeout(() => setProgress(step), (i + 1) * 800);
    });

    setTimeout(() => {
      setResults(getDemoResults());
      setView(VIEWS.RESULTS);
    }, steps.length * 800 + 500);
  }

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col">
      {/* Subtle background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent-cyan/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-violet/5 rounded-full blur-3xl" />
      </div>

      <Header onReset={handleReset} showReset={view !== VIEWS.UPLOAD} />

      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        {error && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
            <div className="glass rounded-xl px-6 py-3 border border-red-500/30 flex items-center gap-3">
              <span className="text-red-400 text-lg">⚠</span>
              <span className="text-red-300 text-sm">{error}</span>
              <button onClick={() => setError(null)} className="text-slate-500 hover:text-slate-300 ml-2">✕</button>
            </div>
          </div>
        )}

        {view === VIEWS.UPLOAD && (
          <FileUploader onFileSelected={handleFileSelected} />
        )}
        {view === VIEWS.PROCESSING && (
          <ProgressIndicator progress={progress} fileName={fileName} />
        )}
        {view === VIEWS.RESULTS && results && (
          <ResultsView results={results} onReset={handleReset} />
        )}
      </main>
    </div>
  );
}

// ─── Demo Data ────────────────────────────────────
function getDemoResults() {
  const criticalAlerts = [
    { alert_id: 'ALT-2024-8842', customer_name: 'Orion Holdings Ltd', transaction_amount: 485000, alert_type: 'Unusual Cross-Border Pattern', risk_score: 0.94, transaction_date: '2024-03-15', source_country: 'Cayman Islands', destination_country: 'Switzerland' },
    { alert_id: 'ALT-2024-8856', customer_name: 'Zenith Capital Group', transaction_amount: 1250000, alert_type: 'Large Cash Structuring', risk_score: 0.91, transaction_date: '2024-03-15', source_country: 'Panama', destination_country: 'United Kingdom' },
    { alert_id: 'ALT-2024-8871', customer_name: 'Mercury Trading Co', transaction_amount: 720000, alert_type: 'Rapid Fund Movement', risk_score: 0.88, transaction_date: '2024-03-14', source_country: 'Hong Kong', destination_country: 'Singapore' },
  ];

  const archivedAlerts = [];
  const justificationLog = [];
  const names = ['Acme Corp', 'Baker Industries', 'Coastal Shipping', 'Delta Services', 'Echo Payments', 'First National', 'Global Imports', 'Harbor Trading'];
  const reasons = [
    'Recurring legitimate trade payment — pattern matches last 6 months of activity.',
    'Regular payroll transfer consistent with employee count and historical salary data.',
    'Scheduled loan repayment matching original loan agreement terms.',
    'Routine supplier payment within established trading relationship (18 months).',
    'Monthly subscription fee consistent with business service contracts.',
    'Standard intercompany transfer between verified subsidiaries.',
    'Regular rent payment matching lease agreement on file.',
    'Dividend distribution consistent with board-approved schedule.',
  ];

  for (let i = 0; i < 47; i++) {
    const alert = {
      alert_id: `ALT-2024-${7000 + i}`,
      customer_name: names[i % names.length],
      transaction_amount: Math.round(5000 + Math.random() * 50000),
      alert_type: ['Wire Transfer', 'Cash Deposit', 'International Transfer', 'ACH Payment'][i % 4],
      risk_score: parseFloat((0.05 + Math.random() * 0.40).toFixed(2)),
      transaction_date: '2024-03-' + String(10 + (i % 6)).padStart(2, '0'),
      source_country: ['United States', 'United Kingdom', 'Germany', 'Japan'][i % 4],
      destination_country: ['United States', 'Canada', 'France', 'Australia'][i % 4],
    };
    archivedAlerts.push(alert);
    justificationLog.push({
      alert_id: alert.alert_id,
      customer_name: alert.customer_name,
      justification: reasons[i % reasons.length],
      confidence: parseFloat((0.85 + Math.random() * 0.14).toFixed(2)),
    });
  }

  return {
    critical_alerts: criticalAlerts,
    archived_alerts: archivedAlerts,
    justification_log: justificationLog,
    summary: {
      total_alerts: criticalAlerts.length + archivedAlerts.length,
      critical_count: criticalAlerts.length,
      archived_count: archivedAlerts.length,
      false_positive_rate: 94,
    },
  };
}
