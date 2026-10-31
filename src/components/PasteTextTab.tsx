import React, { useState } from 'react';
import { Sparkles, Copy, Download, Trash2, ArrowRight, Shield, AlertTriangle, Check, Loader2, RefreshCw } from 'lucide-react';
import { CleanReport, OllamaModel } from '../types';
import { api } from '../utils/cleanerApi';
import { InspectionDrawer } from './InspectionDrawer';

interface PasteTextTabProps {
  ollamaAvailable: boolean;
  ollamaModels: OllamaModel[];
  selectedOllamaModel: string;
  ollamaBaseUrl: string;
}

export const PasteTextTab: React.FC<PasteTextTabProps> = ({
  ollamaAvailable,
  ollamaModels,
  selectedOllamaModel,
  ollamaBaseUrl,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [cleanedText, setCleanedText] = useState<string>('');
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [rewriteMode, setRewriteMode] = useState<boolean>(false);
  const [report, setReport] = useState<CleanReport | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string>(selectedOllamaModel || (ollamaModels[0]?.name ?? ''));

  // Metrics
  const inputChars = inputText.length;
  const inputWords = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const outputChars = cleanedText.length;
  const outputWords = cleanedText.trim() ? cleanedText.trim().split(/\s+/).length : 0;

  const handleClean = async () => {
    if (!inputText.trim()) {
      setErrorMessage('Please enter or paste text to clean.');
      return;
    }

    setErrorMessage(null);
    setIsCleaning(true);
    setReport(null);

    try {
      if (rewriteMode && ollamaAvailable && (activeModel || selectedOllamaModel)) {
        const modelToUse = activeModel || selectedOllamaModel || ollamaModels[0]?.name;
        const res = await api.rewriteText(inputText, modelToUse, ollamaBaseUrl, 'paraphrase');
        if (!res.ok || !res.rewritten) {
          throw new Error(res.error || 'Rewrite failed to generate clean output.');
        }

        setCleanedText(res.rewritten);

        // Also get inspection metrics
        const cleanRes = await api.cleanText(inputText);
        if (cleanRes.ok && cleanRes.report) {
          setReport({
            ...cleanRes.report,
            meta: {
              ...cleanRes.report.meta,
              mode: `rewrite (${modelToUse})`,
            },
          });
        }
      } else {
        // Layer A Unicode & Invisible Cleaning
        const res = await api.cleanText(inputText);
        if (!res.ok) {
          throw new Error(res.error || 'Failed to clean text.');
        }

        if (res.cleaned) {
          // Decode base64 returned from clean endpoint
          const decoded = decodeURIComponent(escape(atob(res.cleaned)));
          setCleanedText(decoded);
        } else {
          setCleanedText(inputText);
        }

        if (res.report) {
          setReport(res.report);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during cleaning.');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleCopy = async () => {
    if (!cleanedText) return;
    try {
      await navigator.clipboard.writeText(cleanedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const handleExportTxt = async () => {
    if (!cleanedText) return;
    if ((window as any).electronAPI?.saveCleanedFile) {
      const b64 = btoa(unescape(encodeURIComponent(cleanedText)));
      const res = await (window as any).electronAPI.saveCleanedFile({
        defaultName: 'cleaned_text.txt',
        base64Content: b64,
      });
      if (res.error && res.error !== 'Save canceled') {
        setErrorMessage(res.error);
      }
    } else {
      // Browser fallback
      const blob = new Blob([cleanedText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cleaned_text.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleClear = () => {
    setInputText('');
    setCleanedText('');
    setReport(null);
    setErrorMessage(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden p-4 gap-4">
      {/* Top Controls Bar */}
      <div className="glass-panel rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: Mode Toggle & Model Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => ollamaAvailable && setRewriteMode(!rewriteMode)}
              disabled={!ollamaAvailable}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                rewriteMode && ollamaAvailable ? 'bg-cyan-500' : 'bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
              title={
                !ollamaAvailable
                  ? 'Rewrite mode requires Ollama running locally with at least one model installed.'
                  : 'Toggle Rewrite Mode (Layer B)'
              }
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  rewriteMode && ollamaAvailable ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span
              className={`text-xs font-medium cursor-pointer ${
                ollamaAvailable ? 'text-slate-200' : 'text-slate-500'
              }`}
              onClick={() => ollamaAvailable && setRewriteMode(!rewriteMode)}
            >
              Rewrite Mode (Layer B)
            </span>
          </div>

          {/* Model selector pill if Rewrite mode enabled */}
          {rewriteMode && ollamaAvailable && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 font-mono">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <select
                value={activeModel || selectedOllamaModel}
                onChange={(e) => setActiveModel(e.target.value)}
                className="bg-transparent text-cyan-200 outline-none cursor-pointer text-xs font-mono"
              >
                {ollamaModels.map((m) => (
                  <option key={m.name} value={m.name} className="bg-surface-200 text-slate-200">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!rewriteMode && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Layer A Only (Zero-Width & Unicode Sanitizer)
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {inputText && (
            <button
              onClick={handleClear}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}

          <button
            onClick={handleClean}
            disabled={isCleaning || !inputText.trim()}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-glow-cyan/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
          >
            {isCleaning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{rewriteMode ? 'Rewriting with Ollama...' : 'Cleaning Text...'}</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5" />
                <span>Clean Text</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Warnings & Messages */}
      {!ollamaAvailable && (
        <div className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-700/50 text-xs text-slate-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            Rewrite mode requires Ollama running locally with at least one model installed. Install from{' '}
            <span className="text-cyan-400 font-mono">ollama.com</span> and pull a model (e.g.{' '}
            <code className="text-slate-300 font-mono bg-black/30 px-1 py-0.5 rounded">ollama pull qwen2.5</code>), then restart this app.
          </span>
        </div>
      )}

      {rewriteMode && ollamaAvailable && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Rewrite mode changes wording to strip statistical watermarks — it will alter tone and phrasing.
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Dual-Textarea Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[260px] overflow-hidden">
        {/* Left: Input Textarea */}
        <div className="glass-panel rounded-xl flex flex-col overflow-hidden border border-border-subtle focus-within:border-cyan-500/40 transition-colors">
          <div className="px-3.5 py-2 bg-surface-200/70 border-b border-border-subtle flex items-center justify-between text-xs text-slate-300 select-none">
            <span className="font-semibold text-slate-200">Original Text</span>
            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
              <span>{inputChars} chars</span>
              <span>{inputWords} words</span>
            </div>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste text containing hidden Unicode, zero-width steganography, bidi overrides, or AI statistical watermarks..."
            className="flex-1 w-full p-3.5 bg-transparent text-slate-200 placeholder-slate-500 text-sm font-mono resize-none outline-none leading-relaxed overflow-y-auto"
            spellCheck={false}
          />
        </div>

        {/* Right: Cleaned Textarea (Read-Only) */}
        <div className="glass-panel rounded-xl flex flex-col overflow-hidden border border-border-subtle relative">
          <div className="px-3.5 py-2 bg-surface-200/70 border-b border-border-subtle flex items-center justify-between text-xs text-slate-300 select-none">
            <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
              Cleaned Text (Sanitized)
            </span>
            <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
              <span>{outputChars} chars</span>
              <span>{outputWords} words</span>
            </div>
          </div>

          <textarea
            value={cleanedText}
            readOnly
            placeholder="Cleaned text will appear here with all zero-width characters, homoglyphs, and metadata stripped..."
            className="flex-1 w-full p-3.5 bg-transparent text-emerald-100/90 placeholder-slate-600 text-sm font-mono resize-none outline-none leading-relaxed overflow-y-auto"
            spellCheck={false}
          />

          {/* Quick Action Floating Bar for Cleaned Output */}
          {cleanedText && (
            <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-surface-100/95 border border-border-subtle p-1.5 rounded-lg shadow-lg backdrop-blur">
              <button
                onClick={handleCopy}
                className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-200 hover:text-white transition-colors flex items-center gap-1.5"
                title="Copy Cleaned Text"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleExportTxt}
                className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-200 hover:text-white transition-colors flex items-center gap-1.5"
                title="Export as .txt"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Export .txt</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Inspection & Removed Items Drawer */}
      <InspectionDrawer report={report} mode="text" />
    </div>
  );
};
