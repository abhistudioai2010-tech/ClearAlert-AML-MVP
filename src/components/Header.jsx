import React from 'react';

export default function Header({ onReset, showReset }) {
  return (
    <header className="relative z-20 drag-region">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-3 no-drag">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent-cyan to-accent-violet flex items-center justify-center shadow-lg shadow-accent-cyan/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-100">
              Clear<span className="gradient-text">Alert</span>
            </h1>
            <p className="text-[10px] text-slate-500 -mt-0.5 tracking-wider uppercase">
              AML False Positive Reduction
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 no-drag">
          {showReset && (
            <button
              onClick={onReset}
              className="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 glass rounded-lg transition-all duration-200 hover:border-slate-600"
            >
              ← New Analysis
            </button>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-slow" />
            <span className="text-[11px] text-slate-400">Offline · Secure</span>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent" />
    </header>
  );
}
