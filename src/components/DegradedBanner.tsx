import React from 'react';
import { AlertTriangle, ExternalLink, X } from 'lucide-react';
import { SystemToolsStatus } from '../types';

interface DegradedBannerProps {
  toolsStatus: SystemToolsStatus;
  dismissed: boolean;
  onDismiss: () => void;
}

export const DegradedBanner: React.FC<DegradedBannerProps> = ({
  toolsStatus,
  dismissed,
  onDismiss,
}) => {
  // If both qpdf and exiftool are installed or user dismissed it, don't show
  if ((toolsStatus.qpdf && toolsStatus.exiftool) || dismissed) {
    return null;
  }

  const openLink = (url: string) => {
    if ((window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  const missingTools = [];
  if (!toolsStatus.qpdf) missingTools.push('qpdf');
  if (!toolsStatus.exiftool) missingTools.push('exiftool');

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between text-xs text-amber-200 shrink-0 z-40">
      <div className="flex items-center gap-2.5">
        <div className="p-1 rounded bg-amber-500/20 text-amber-300">
          <AlertTriangle className="w-4 h-4" />
        </div>
        <div>
          <span className="font-medium text-amber-100">
            PDF cleaning will be degraded (metadata may remain recoverable) — install qpdf and exiftool for a full clean.
          </span>
          <span className="ml-2 text-amber-300/80">
            Missing: <span className="font-mono">{missingTools.join(', ')}</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!toolsStatus.qpdf && (
          <button
            onClick={() => openLink('https://github.com/qpdf/qpdf/releases')}
            className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 transition-colors"
          >
            <span>Download qpdf</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}

        {!toolsStatus.exiftool && (
          <button
            onClick={() => openLink('https://exiftool.org/')}
            className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 transition-colors"
          >
            <span>Download exiftool</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}

        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-white/10 text-amber-300/70 hover:text-amber-100 transition-colors ml-1"
          title="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
