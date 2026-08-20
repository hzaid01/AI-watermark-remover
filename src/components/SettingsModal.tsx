import React, { useState } from 'react';
import { X, Folder, RefreshCw, Cpu, Shield, AlertTriangle, Check, ExternalLink, HardDrive } from 'lucide-react';
import { AppSettings, OllamaModel, SystemToolsStatus } from '../types';
import { CleanerApi } from '../utils/cleanerApi';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  ollamaModels: OllamaModel[];
  ollamaAvailable: boolean;
  onRefreshOllama: () => Promise<void>;
  isRefreshingOllama: boolean;
  toolsStatus: SystemToolsStatus;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  ollamaModels,
  ollamaAvailable,
  onRefreshOllama,
  isRefreshingOllama,
  toolsStatus,
}) => {
  const [outputFolder, setOutputFolder] = useState<string>(settings.outputFolder);
  const [preserveOriginals, setPreserveOriginals] = useState<boolean>(settings.preserveOriginals);
  const [selectedModel, setSelectedModel] = useState<string>(settings.selectedOllamaModel || (ollamaModels[0]?.name ?? ''));
  const [backendPort, setBackendPort] = useState<number>(settings.backendPort);
  const [showPreserveWarningModal, setShowPreserveWarningModal] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSelectFolder = async () => {
    if ((window as any).electronAPI?.selectDirectoryDialog) {
      const folder = await (window as any).electronAPI.selectDirectoryDialog();
      if (folder) {
        setOutputFolder(folder);
      }
    }
  };

  const handleTogglePreserve = () => {
    if (preserveOriginals) {
      // Trying to turn it OFF -> requires explicit confirmation
      setShowPreserveWarningModal(true);
    } else {
      setPreserveOriginals(true);
    }
  };

  const handleConfirmDisablePreserve = () => {
    setPreserveOriginals(false);
    setShowPreserveWarningModal(false);
  };

  const handleSave = () => {
    onSaveSettings({
      outputFolder,
      preserveOriginals,
      ollamaBaseUrl: settings.ollamaBaseUrl,
      selectedOllamaModel: selectedModel,
      backendPort,
    });
    onClose();
  };

  const openLink = (url: string) => {
    if ((window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-xl rounded-2xl border border-border-subtle shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between bg-surface-200/50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-100">Preferences & Diagnostics</h3>
              <p className="text-[11px] text-slate-400">Configure local engines, outputs, and privacy controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Section 1: Output Folder */}
          <div className="space-y-2">
            <label className="font-medium text-slate-300 block">Default Output Folder</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={outputFolder}
                onChange={(e) => setOutputFolder(e.target.value)}
                placeholder="Same folder as input file (Default)"
                className="flex-1 px-3 py-2 rounded-lg bg-surface-200 border border-border-subtle text-slate-200 font-mono placeholder-slate-500 outline-none focus:border-cyan-500/40"
              />
              <button
                onClick={handleSelectFolder}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-border-subtle text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
              >
                <Folder className="w-3.5 h-3.5 text-cyan-400" />
                <span>Browse</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              If left empty, cleaned files will be saved in the same directory as the original file.
            </p>
          </div>

          {/* Section 2: Preserve Original Files */}
          <div className="p-3.5 rounded-xl bg-surface-200/60 border border-border-subtle flex items-center justify-between gap-4">
            <div>
              <div className="font-medium text-slate-200">Preserve original files</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Always writes output to <code className="font-mono text-cyan-400">original.cleaned.ext</code> and never overwrites original inputs.
              </p>
            </div>
            <button
              onClick={handleTogglePreserve}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                preserveOriginals ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  preserveOriginals ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Section 3: Ollama Rewrite Mode Configuration */}
          <div className="space-y-3 p-3.5 rounded-xl bg-surface-200/60 border border-border-subtle">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="font-medium text-slate-200">Ollama Local Rewrite Engine</span>
              </div>
              <button
                onClick={onRefreshOllama}
                disabled={isRefreshingOllama}
                className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-border-subtle text-[11px] font-mono text-slate-300 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingOllama ? 'animate-spin text-cyan-400' : ''}`} />
                <span>Re-scan Models</span>
              </button>
            </div>

            {ollamaAvailable ? (
              <div className="space-y-2">
                <label className="text-[11px] text-slate-400 block">Selected Ollama Model:</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-border-subtle text-cyan-300 font-mono outline-none focus:border-cyan-500/40 cursor-pointer"
                >
                  {ollamaModels.map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name} {m.details?.parameter_size ? `(${m.details.parameter_size})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Ollama connected with {ollamaModels.length} installed model(s).</span>
                </p>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-slate-800/80 border border-border-subtle text-[11px] text-slate-400 space-y-1">
                <p className="text-amber-300 font-medium">Ollama is not running locally.</p>
                <p>
                  Install from <span className="text-cyan-400 font-mono">ollama.com</span> and pull a model (e.g.{' '}
                  <code className="text-slate-200 font-mono bg-black/40 px-1 py-0.5 rounded">ollama pull llama3.2</code>), then click Re-scan.
                </p>
              </div>
            )}
          </div>

          {/* Section 4: System Dependencies (qpdf, exiftool) */}
          <div className="space-y-2 p-3.5 rounded-xl bg-surface-200/60 border border-border-subtle">
            <div className="flex items-center gap-2 font-medium text-slate-200">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>External Cleaning Tools (PATH Diagnostics)</span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="p-2.5 rounded-lg bg-surface-100 border border-border-subtle flex items-center justify-between">
                <div>
                  <div className="font-mono text-[11px] text-slate-300">qpdf</div>
                  <div className={`text-[10px] ${toolsStatus.qpdf ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {toolsStatus.qpdf ? 'Installed' : 'Missing'}
                  </div>
                </div>
                {!toolsStatus.qpdf && (
                  <button
                    onClick={() => openLink('https://github.com/qpdf/qpdf/releases')}
                    className="p-1 text-cyan-400 hover:text-cyan-300"
                    title="Download qpdf"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-surface-100 border border-border-subtle flex items-center justify-between">
                <div>
                  <div className="font-mono text-[11px] text-slate-300">exiftool</div>
                  <div className={`text-[10px] ${toolsStatus.exiftool ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {toolsStatus.exiftool ? 'Installed' : 'Missing'}
                  </div>
                </div>
                {!toolsStatus.exiftool && (
                  <button
                    onClick={() => openLink('https://exiftool.org/')}
                    className="p-1 text-cyan-400 hover:text-cyan-300"
                    title="Download exiftool"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: Backend Port Override */}
          <div className="space-y-1.5">
            <label className="font-medium text-slate-300 block">Core Backend Service Port</label>
            <input
              type="number"
              value={backendPort}
              onChange={(e) => setBackendPort(parseInt(e.target.value) || 8765)}
              className="w-32 px-3 py-1.5 rounded-lg bg-surface-200 border border-border-subtle text-slate-200 font-mono text-xs outline-none focus:border-cyan-500/40"
            />
            <p className="text-[11px] text-slate-400">
              Default: 8765. The app automatically probes the next available port if taken.
            </p>
          </div>

          {/* Privacy Guarantee Note */}
          <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-[11px] text-cyan-300/90 leading-relaxed">
            <span className="font-semibold text-cyan-300">Privacy Guarantee: </span>
            Everything local. No file ever leaves the machine. No calls to any host except 127.0.0.1 (backend service) and localhost:11434 (Ollama, only if Rewrite Mode is used).
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-border-subtle flex items-center justify-end gap-2.5 bg-surface-200/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-glow-cyan/20 transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Confirmation Modal when disabling 'Preserve original files' */}
      {showPreserveWarningModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
          <div className="glass-panel w-full max-w-sm rounded-xl p-5 border border-amber-500/40 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-semibold text-sm text-slate-100">Disable Original File Preservation?</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Disabling this option allows output files to overwrite original files. Are you sure you want to proceed?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPreserveWarningModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-white/10 transition-colors"
              >
                Keep Preserved
              </button>
              <button
                onClick={handleConfirmDisablePreserve}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white transition-colors"
              >
                Confirm Disable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
