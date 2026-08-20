import React from 'react';
import { Minus, Square, X, Settings, ShieldCheck, Cpu, Sparkles } from 'lucide-react';
import { OllamaModel } from '../types';

interface TitleBarProps {
  backendPort: number;
  isBackendHealthy: boolean;
  ollamaAvailable: boolean;
  selectedModel: string;
  onOpenSettings: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  backendPort,
  isBackendHealthy,
  ollamaAvailable,
  selectedModel,
  onOpenSettings,
}) => {
  const handleMinimize = () => {
    (window as any).electronAPI?.minimizeWindow();
  };

  const handleMaximize = () => {
    (window as any).electronAPI?.maximizeWindow();
  };

  const handleClose = () => {
    (window as any).electronAPI?.closeWindow();
  };

  return (
    <header className="h-11 bg-surface-200/90 border-b border-border-subtle flex items-center justify-between px-3 select-none titlebar-drag shrink-0 z-50">
      {/* Left: Brand & App Title */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-glow-cyan/20">
          <ShieldCheck className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-semibold text-xs tracking-wide text-slate-200 uppercase font-mono">
          Document & Text Cleaner
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-mono border border-white/5">
          v1.0
        </span>
      </div>

      {/* Center: System Status Badges */}
      <div className="flex items-center gap-2 titlebar-no-drag">
        {/* Backend Status Pill */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono border transition-colors ${
            isBackendHealthy
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300 animate-pulse'
          }`}
          title={isBackendHealthy ? `Core Engine bound to 127.0.0.1:${backendPort}` : 'Connecting to Core Engine...'}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isBackendHealthy ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-rose-400'
            }`}
          />
          <span>127.0.0.1:{backendPort}</span>
        </div>

        {/* Ollama Status Pill */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono border transition-colors ${
            ollamaAvailable
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
              : 'bg-slate-800/60 border-border-subtle text-slate-400'
          }`}
          title={
            ollamaAvailable
              ? `Ollama detected: Model '${selectedModel || 'Default'}' ready`
              : 'Ollama local rewrite engine not detected'
          }
        >
          <Cpu className="w-3 h-3" />
          <span>
            {ollamaAvailable ? selectedModel || 'Ollama Ready' : 'Ollama Offline'}
          </span>
        </div>
      </div>

      {/* Right: Settings & Window Controls */}
      <div className="flex items-center gap-1 titlebar-no-drag">
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          title="Settings & Diagnostics"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        <div className="h-3.5 w-px bg-white/10 mx-1" />

        <button
          onClick={handleMinimize}
          className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
          title="Minimize"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleMaximize}
          className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
          title="Maximize / Restore"
        >
          <Square className="w-3 h-3" />
        </button>
        <button
          onClick={handleClose}
          className="p-1.5 rounded hover:bg-rose-600/80 text-slate-400 hover:text-white transition-colors"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
