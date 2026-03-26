import React from 'react';

export default function ProgressIndicator({ progress, fileName }) {
  const { percent, message } = progress;
  const circumference = 2 * Math.PI * 54; // radius = 54
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-8 animate-fade-in">
      {/* Circular progress */}
      <div className="relative w-40 h-40">
        {/* Background glow */}
        <div className="absolute inset-0 rounded-full bg-accent-cyan/5 blur-xl animate-pulse-slow" />

        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Track */}
          <circle
            cx="60" cy="60" r="54"
            fill="none" stroke="#1e293b" strokeWidth="6"
          />
          {/* Progress arc */}
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-500 ease-out"
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-slate-100">{percent}%</span>
        </div>
      </div>

      {/* Status text */}
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-slate-200">{message || 'Preparing...'}</p>
        {fileName && (
          <p className="text-sm text-slate-500">
            Processing <span className="text-slate-400 font-medium">{fileName}</span>
          </p>
        )}
      </div>

      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-accent-cyan/60"
            style={{
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
