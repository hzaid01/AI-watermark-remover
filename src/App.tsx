import React, { useState, useEffect } from 'react';
import { TitleBar } from './components/TitleBar';
import { DegradedBanner } from './components/DegradedBanner';
import { PasteTextTab } from './components/PasteTextTab';
import { UploadFileTab } from './components/UploadFileTab';
import { SettingsModal } from './components/SettingsModal';
import { AppSettings, OllamaModel, SystemToolsStatus } from './types';
import { CleanerApi, api } from './utils/cleanerApi';
import { FileText, Type, Shield, Sparkles, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isDegradedBannerDismissed, setIsDegradedBannerDismissed] = useState<boolean>(false);

  // App Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('cleaner_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      outputFolder: '',
      preserveOriginals: true,
      ollamaBaseUrl: 'http://127.0.0.1:11434',
      selectedOllamaModel: '',
      backendPort: 8765,
    };
  });

  // Backend Health & Ollama Status
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(false);
  const [ollamaAvailable, setOllamaAvailable] = useState<boolean>(false);
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [isRefreshingOllama, setIsRefreshingOllama] = useState<boolean>(false);

  // Diagnostics Tools Status
  const [toolsStatus, setToolsStatus] = useState<SystemToolsStatus>({
    qpdf: false,
    exiftool: false,
  });

  // Save settings helper
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('cleaner_settings', JSON.stringify(newSettings));
    if (newSettings.backendPort !== settings.backendPort) {
      api.setBackendUrl(`http://127.0.0.1:${newSettings.backendPort}`);
    }
  };

  // Poll backend health
  useEffect(() => {
    let isMounted = true;

    const checkBackend = async () => {
      // If electronAPI provides port
      if ((window as any).electronAPI?.getBackendPort) {
        try {
          const port = await (window as any).electronAPI.getBackendPort();
          api.setBackendUrl(`http://127.0.0.1:${port}`);
          setSettings((prev) => ({ ...prev, backendPort: port }));
        } catch {}
      }

      const health = await api.checkHealth();
      if (isMounted) {
        setIsBackendHealthy(health.ok);
      }
    };

    checkBackend();
    const interval = setInterval(checkBackend, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Check system tools diagnostics
  useEffect(() => {
    const fetchTools = async () => {
      if ((window as any).electronAPI?.checkTools) {
        const tools = await (window as any).electronAPI.checkTools();
        setToolsStatus(tools);
      } else {
        // Fallback check capabilities from server
        const caps = await api.getCapabilities();
        if (caps?.tools) {
          setToolsStatus({
            qpdf: Boolean(caps.tools.qpdf),
            exiftool: Boolean(caps.tools.exiftool),
          });
        }
      }
    };
    fetchTools();
  }, [isBackendHealthy]);

  // Scan Ollama models
  const scanOllama = async () => {
    setIsRefreshingOllama(true);
    const res = await CleanerApi.fetchOllamaModels(settings.ollamaBaseUrl);
    setOllamaAvailable(res.available);
    setOllamaModels(res.models);
    if (res.available && !settings.selectedOllamaModel && res.models.length > 0) {
      setSettings((prev) => ({ ...prev, selectedOllamaModel: res.models[0].name }));
    }
    setIsRefreshingOllama(false);
  };

  useEffect(() => {
    scanOllama();
  }, [settings.ollamaBaseUrl]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-slate-100 overflow-hidden select-none">
      {/* Title Bar with Window Controls & Status Pills */}
      <TitleBar
        backendPort={settings.backendPort}
        isBackendHealthy={isBackendHealthy}
        ollamaAvailable={ollamaAvailable}
        selectedModel={settings.selectedOllamaModel || (ollamaModels[0]?.name ?? '')}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Non-blocking degraded PDF banner */}
      <DegradedBanner
        toolsStatus={toolsStatus}
        dismissed={isDegradedBannerDismissed}
        onDismiss={() => setIsDegradedBannerDismissed(true)}
      />

      {/* Navigation Tabs Header */}
      <div className="px-5 pt-3 flex items-center justify-between border-b border-border-subtle bg-surface-200/40 shrink-0">
        <div className="flex items-center gap-2">
          {/* Tab 1: Paste Text */}
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition-all relative ${
              activeTab === 'text'
                ? 'text-cyan-400 bg-surface-100/90 border-t border-x border-border-subtle shadow-card'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Paste Text</span>
            {activeTab === 'text' && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-t" />
            )}
          </button>

          {/* Tab 2: Upload File */}
          <button
            onClick={() => setActiveTab('file')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition-all relative ${
              activeTab === 'file'
                ? 'text-cyan-400 bg-surface-100/90 border-t border-x border-border-subtle shadow-card'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Upload File</span>
            {activeTab === 'file' && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-t" />
            )}
          </button>
        </div>

        {/* Top Right Privacy Indicator */}
        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 pb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Local Engine Active</span>
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-surface-200/20 to-background">
        {activeTab === 'text' ? (
          <PasteTextTab
            ollamaAvailable={ollamaAvailable}
            ollamaModels={ollamaModels}
            selectedOllamaModel={settings.selectedOllamaModel}
            ollamaBaseUrl={settings.ollamaBaseUrl}
          />
        ) : (
          <UploadFileTab
            settings={settings}
            ollamaAvailable={ollamaAvailable}
            ollamaModels={ollamaModels}
            selectedOllamaModel={settings.selectedOllamaModel}
          />
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        ollamaModels={ollamaModels}
        ollamaAvailable={ollamaAvailable}
        onRefreshOllama={scanOllama}
        isRefreshingOllama={isRefreshingOllama}
        toolsStatus={toolsStatus}
      />
    </div>
  );
};
