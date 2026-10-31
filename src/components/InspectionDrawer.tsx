import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck, CheckCircle2, AlertCircle, Info, Sparkles, FileText, Trash2, RefreshCw } from 'lucide-react';
import { CleanReport, CleanStats } from '../types';

interface InspectionDrawerProps {
  report: CleanReport | null;
  mode: 'text' | 'file';
  filename?: string;
}

export const InspectionDrawer: React.FC<InspectionDrawerProps> = ({ report, mode, filename }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  if (!report) return null;

  const stats = report.stats;
  const removedEntries = stats?.removed ? Object.entries(stats.removed) : [];
  const replacedEntries = stats?.replaced ? Object.entries(stats.replaced) : [];
  const actions = report.actions || [];

  const totalRemoved = stats?.removed_count ?? 0;
  const totalReplaced = stats?.replaced_count ?? 0;
  const isDegraded = Boolean(report.meta?.degraded);

  // Generate plain-language summary
  const generateSummaryText = (): string => {
    const parts: string[] = [];

    if (totalRemoved > 0) {
      parts.push(`Removed ${totalRemoved} invisible / zero-width character${totalRemoved === 1 ? '' : 's'}`);
    }
    if (totalReplaced > 0) {
      parts.push(`Normalized ${totalReplaced} homoglyph space${totalReplaced === 1 ? '' : 's'}`);
    }

    if (actions.length > 0) {
      const docPropsCount = actions.filter((a) => a.toLowerCase().includes('docprops') || a.toLowerCase().includes('meta.xml') || a.toLowerCase().includes('metadata')).length;
      if (docPropsCount > 0) {
        parts.push('Stripped document metadata & author properties');
      }
      const customXml = actions.filter((a) => a.toLowerCase().includes('customxml')).length;
      if (customXml > 0) {
        parts.push('Removed embedded AI custom XML tags');
      }
      const frontmatter = actions.filter((a) => a.toLowerCase().includes('frontmatter')).length;
      if (frontmatter > 0) {
        parts.push('Cleaned AI frontmatter keys');
      }
      const htmlMeta = actions.filter((a) => a.toLowerCase().includes('html') || a.toLowerCase().includes('tag')).length;
      if (htmlMeta > 0) {
        parts.push('Scrubbed AI metadata tags and script headers');
      }
    }

    if (parts.length === 0) {
      return 'No hidden watermarks, zero-width characters, or residual AI metadata detected.';
    }

    return parts.join(', ') + '.';
  };

  return (
    <div className="rounded-xl bg-surface-100/90 border border-border-subtle overflow-hidden shadow-card transition-all">
      {/* Header / Accordion trigger */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs text-slate-200 tracking-wide">
                What Was Removed & Cleaned
              </span>
              {isDegraded && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                  Degraded Mode
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
              {generateSummaryText()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-cyan-400">
            {totalRemoved + totalReplaced + (actions.length > 0 ? 1 : 0)} items sanitized
          </span>
          <div className="p-1 rounded text-slate-400 hover:text-slate-200">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Accordion Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-border-subtle bg-surface-200/50 space-y-3">
          {/* Plain Language Summary Box */}
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-slate-300 leading-relaxed">
              <span className="font-medium text-emerald-300">Sanitization Result: </span>
              {generateSummaryText()}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {/* Removed Invisible Characters */}
            {removedEntries.length > 0 && (
              <div className="p-3 rounded-lg bg-surface-100 border border-border-subtle space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <Trash2 className="w-3.5 h-3.5" />
                    Invisible Characters Stripped
                  </span>
                  <span className="font-mono text-rose-400 font-semibold">{totalRemoved}</span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {removedEntries.map(([label, count]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between text-[11px] font-mono px-2 py-1 rounded bg-black/20 text-slate-300"
                    >
                      <span className="truncate pr-2">{label}</span>
                      <span className="text-rose-400 font-semibold shrink-0">x{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Replaced Homoglyphs */}
            {replacedEntries.length > 0 && (
              <div className="p-3 rounded-lg bg-surface-100 border border-border-subtle space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <RefreshCw className="w-3.5 h-3.5" />
                    Normalized Characters
                  </span>
                  <span className="font-mono text-cyan-400 font-semibold">{totalReplaced}</span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {replacedEntries.map(([label, count]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between text-[11px] font-mono px-2 py-1 rounded bg-black/20 text-slate-300"
                    >
                      <span className="truncate pr-2">{label}</span>
                      <span className="text-cyan-400 font-semibold shrink-0">x{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Document Structure & Metadata Actions */}
            {actions.length > 0 && (
              <div className="p-3 rounded-lg bg-surface-100 border border-border-subtle space-y-2 md:col-span-2">
                <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <FileText className="w-3.5 h-3.5" />
                    Document Structure & Container Actions
                  </span>
                  <span className="font-mono text-emerald-400 font-semibold">{actions.length}</span>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {actions.map((act, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-[11px] font-mono px-2 py-1 rounded bg-black/20 text-slate-300"
                    >
                      <span className="text-emerald-400">•</span>
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
