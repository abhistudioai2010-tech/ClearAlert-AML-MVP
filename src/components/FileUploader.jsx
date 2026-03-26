import React, { useState, useRef, useCallback } from 'react';

export default function FileUploader({ onFileSelected }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFile = useCallback((file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      alert('Please upload a CSV or Excel file.');
      return;
    }
    // Pass the file path; in Electron, File objects include a path property
    const filePath = file.path || file.name;
    onFileSelected(filePath, file.name);
  }, [onFileSelected]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleClick = useCallback(async () => {
    if (window.clearalert) {
      const filePath = await window.clearalert.selectFile();
      if (filePath) {
        const name = filePath.split(/[\\/]/).pop();
        onFileSelected(filePath, name);
      }
    } else {
      fileInputRef.current?.click();
    }
  }, [onFileSelected]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }, [processFile]);

  return (
    <div className="w-full max-w-2xl animate-fade-in">
      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-100 mb-2">
          Analyze Your <span className="gradient-text">AML Alerts</span>
        </h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Upload your daily transaction alerts file. Our local ML engine will identify
          false positives and generate audit-ready justification logs — all offline.
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`
          relative group cursor-pointer rounded-2xl p-12
          border-2 border-dashed transition-all duration-300
          ${isDragging
            ? 'drop-zone-active border-accent-cyan bg-accent-cyan/5'
            : 'border-slate-700 hover:border-slate-500 bg-surface-800/30 hover:bg-surface-800/50'
          }
        `}
      >
        {/* Glow effect on hover */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-cyan/5 to-accent-violet/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <div className="relative flex flex-col items-center gap-5">
          {/* Icon */}
          <div className={`
            w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300
            ${isDragging
              ? 'bg-accent-cyan/20 scale-110'
              : 'bg-surface-700/80 group-hover:bg-surface-700'
            }
          `}>
            <svg
              className={`w-10 h-10 transition-colors duration-300 ${isDragging ? 'text-accent-cyan' : 'text-slate-400 group-hover:text-slate-300'}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>

          {/* Text */}
          <div className="text-center">
            <p className={`text-lg font-semibold mb-1 transition-colors ${isDragging ? 'text-accent-cyan' : 'text-slate-200'}`}>
              {isDragging ? 'Drop your file here' : 'Drag & drop your alert file'}
            </p>
            <p className="text-sm text-slate-500">
              or <span className="text-accent-cyan hover:underline">click to browse</span>
            </p>
          </div>

          {/* Supported formats */}
          <div className="flex gap-2">
            {['CSV', 'XLSX', 'XLS'].map((fmt) => (
              <span key={fmt} className="px-3 py-1 text-[11px] font-medium text-slate-400 bg-surface-700/60 rounded-full">
                .{fmt.toLowerCase()}
              </span>
            ))}
          </div>
        </div>

        {/* Hidden file input for browser fallback */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Privacy badge */}
      <div className="flex items-center justify-center gap-2 mt-6">
        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        <span className="text-xs text-slate-500">
          All data stays on your machine. Zero network requests.
        </span>
      </div>
    </div>
  );
}
