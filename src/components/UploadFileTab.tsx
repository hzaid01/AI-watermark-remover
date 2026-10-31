import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, ShieldCheck, Download, Trash2, Loader2, Sparkles, FolderCheck, AlertCircle } from 'lucide-react';
import { CleanReport, OllamaModel, AppSettings } from '../types';
import { validateFile, getCleanedFilename, formatBytes, extractExtension, UNSUPPORTED_ERROR_MESSAGE } from '../utils/fileValidation';
import { api } from '../utils/cleanerApi';
import { InspectionDrawer } from './InspectionDrawer';

interface UploadFileTabProps {
  settings: AppSettings;
  ollamaAvailable: boolean;
  ollamaModels: OllamaModel[];
  selectedOllamaModel: string;
}

interface LoadedFile {
  name: string;
  size: number;
  base64: string;
  extension: string;
  isStructuredDoc: boolean;
  path?: string;
}

export const UploadFileTab: React.FC<UploadFileTabProps> = ({
  settings,
  ollamaAvailable,
  ollamaModels,
  selectedOllamaModel,
}) => {
  const [currentFile, setCurrentFile] = useState<LoadedFile | null>(null);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [cleanProgress, setCleanProgress] = useState<number>(0);
  const [cleanedBase64, setCleanedBase64] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [report, setReport] = useState<CleanReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rewriteMode, setRewriteMode] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = (name: string, size: number, base64: string, path?: string) => {
    setErrorMessage(null);
    setCleanedBase64(null);
    setSavedPath(null);
    setReport(null);

    // Client-side validation BEFORE any API call
    const validation = validateFile(name);
    if (!validation.valid) {
      setErrorMessage(validation.error || UNSUPPORTED_ERROR_MESSAGE);
      setCurrentFile(null);
      return;
    }

    setCurrentFile({
      name,
      size,
      base64,
      extension: validation.extension,
      isStructuredDoc: validation.isStructuredDoc,
      path,
    });
  };

  const handleOpenFilePicker = async () => {
    if ((window as any).electronAPI?.openFileDialog) {
      const result = await (window as any).electronAPI.openFileDialog();
      if (result) {
        handleProcessFile(result.name, result.size, result.base64, result.path);
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleNativeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = (reader.result as string).split(',')[1];
      handleProcessFile(file.name, file.size, b64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const filePath = (file as any).path;

      // If electron API can read full path
      if (filePath && (window as any).electronAPI?.readFilePath) {
        const res = await (window as any).electronAPI.readFilePath(filePath);
        if (res.success && res.file) {
          handleProcessFile(res.file.name, res.file.size, res.file.base64, res.file.path);
          return;
        }
      }

      const reader = new FileReader();
      reader.onload = () => {
        const b64 = (reader.result as string).split(',')[1];
        handleProcessFile(file.name, file.size, b64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCleanFile = async () => {
    if (!currentFile) return;

    setErrorMessage(null);
    setIsCleaning(true);
    setCleanProgress(20);
    setReport(null);

    try {
      setCleanProgress(50);
      const res = await api.cleanFile(currentFile.name, currentFile.base64, {
        nfkc: false,
        aggressive_homoglyphs: false,
        strip_all_metadata: true,
      });

      setCleanProgress(90);

      if (!res.ok || !res.cleaned) {
        throw new Error(res.error || 'Cleaning pipeline returned an error.');
      }

      setCleanedBase64(res.cleaned);
      if (res.report) {
        setReport(res.report);
      }
      setCleanProgress(100);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while cleaning the document.');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleSaveFile = async () => {
    if (!currentFile || !cleanedBase64) return;

    const defaultCleanedName = getCleanedFilename(currentFile.name);

    if ((window as any).electronAPI?.saveCleanedFile) {
      const res = await (window as any).electronAPI.saveCleanedFile({
        defaultName: defaultCleanedName,
        base64Content: cleanedBase64,
        customOutputDir: settings.outputFolder || undefined,
      });

      if (res.success && res.savedPath) {
        setSavedPath(res.savedPath);
      } else if (res.error && res.error !== 'Save canceled') {
        setErrorMessage(res.error);
      }
    } else {
      // Browser fallback download
      const binaryString = atob(cleanedBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = defaultCleanedName;
      a.click();
      URL.revokeObjectURL(url);
      setSavedPath(defaultCleanedName);
    }
  };

  const handleRemoveFile = () => {
    setCurrentFile(null);
    setCleanedBase64(null);
    setReport(null);
    setSavedPath(null);
    setErrorMessage(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 gap-4">
      {/* Hidden browser input for fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.pdf,.odt,.html,.htm,.md,.markdown,.txt"
        onChange={handleNativeInputChange}
        className="hidden"
      />

      {/* Top File Action & Mode Header */}
      <div className="glass-panel rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {/* Rewrite Mode Toggle for files */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!currentFile?.isStructuredDoc && ollamaAvailable) {
                  setRewriteMode(!rewriteMode);
                }
              }}
              disabled={currentFile?.isStructuredDoc || !ollamaAvailable}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                rewriteMode && !currentFile?.isStructuredDoc && ollamaAvailable
                  ? 'bg-cyan-500'
                  : 'bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
              title={
                currentFile?.isStructuredDoc
                  ? 'Rewrite mode is text-only in this version'
                  : !ollamaAvailable
                  ? 'Ollama not detected'
                  : 'Toggle Rewrite Mode'
              }
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  rewriteMode && !currentFile?.isStructuredDoc && ollamaAvailable ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span
              className={`text-xs font-medium ${
                currentFile?.isStructuredDoc || !ollamaAvailable ? 'text-slate-500 cursor-not-allowed' : 'text-slate-200 cursor-pointer'
              }`}
            >
              Rewrite Mode (Layer B)
            </span>
          </div>

          {currentFile?.isStructuredDoc && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-border-subtle">
              Rewrite mode is text-only in this version
            </span>
          )}

          {!currentFile?.isStructuredDoc && !rewriteMode && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Layer A + Container Metadata Strip
            </span>
          )}
        </div>

        {/* Supported Types Chips */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
          <span className="px-1.5 py-0.5 rounded bg-black/30 border border-white/5">.DOCX</span>
          <span className="px-1.5 py-0.5 rounded bg-black/30 border border-white/5">.PDF</span>
          <span className="px-1.5 py-0.5 rounded bg-black/30 border border-white/5">.ODT</span>
          <span className="px-1.5 py-0.5 rounded bg-black/30 border border-white/5">.HTML</span>
          <span className="px-1.5 py-0.5 rounded bg-black/30 border border-white/5">.MD</span>
          <span className="px-1.5 py-0.5 rounded bg-black/30 border border-white/5">.TXT</span>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Main Drag & Drop Zone / File Card */}
      {!currentFile ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={handleOpenFilePicker}
          className={`flex-1 min-h-[280px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-500/10 shadow-glow-cyan'
              : 'border-border-subtle hover:border-cyan-500/40 bg-surface-100/50 hover:bg-surface-100/80'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center mb-4 text-cyan-400 shadow-glow-cyan/20">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-base font-semibold text-slate-100 mb-1">
            Drag & drop your document here, or <span className="text-cyan-400 underline decoration-cyan-500/40">browse</span>
          </h3>
          <p className="text-xs text-slate-400 max-w-md mb-4">
            Supports DOCX, PDF, ODT, HTML, Markdown, and TXT files. All processing is strictly local.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-black/40 text-slate-300 border border-white/5">
              DOCX (docProps/customXml)
            </span>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-black/40 text-slate-300 border border-white/5">
              PDF (exiftool + qpdf)
            </span>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-black/40 text-slate-300 border border-white/5">
              ODT (meta.xml)
            </span>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-black/40 text-slate-300 border border-white/5">
              HTML / Markdown / TXT
            </span>
          </div>
        </div>
      ) : (
        /* Loaded File Card & Action Panel */
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-border-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm uppercase">
                {currentFile.extension}
              </div>
              <div>
                <h4 className="font-semibold text-sm text-slate-100 break-all">{currentFile.name}</h4>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-1">
                  <span>Size: {formatBytes(currentFile.size)}</span>
                  <span>•</span>
                  <span className="text-emerald-400">Validated: {currentFile.extension.toUpperCase()}</span>
                  {currentFile.isStructuredDoc && (
                    <>
                      <span>•</span>
                      <span className="text-cyan-400">Structured Document</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Actions for current file */}
            <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
              <button
                onClick={handleRemoveFile}
                className="px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>

              <button
                onClick={handleCleanFile}
                disabled={isCleaning}
                className="px-5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white shadow-glow-cyan/30 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isCleaning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cleaning File...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Clean Document</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Cleaned Result Success & Save Trigger */}
          {cleanedBase64 && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-semibold text-xs text-emerald-200">
                    Sanitization Complete — Metadata & Hidden Artefacts Stripped
                  </h5>
                  <p className="text-[11px] text-emerald-300/80 font-mono mt-0.5">
                    Target Name: {getCleanedFilename(currentFile.name)}
                  </p>
                  {savedPath && (
                    <p className="text-[11px] text-slate-300 font-mono mt-1 flex items-center gap-1">
                      <FolderCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Saved to: {savedPath}</span>
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handleSaveFile}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow-emerald/30 transition-all flex items-center gap-2 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Save Cleaned File</span>
              </button>
            </div>
          )}

          {/* Inspection Drawer */}
          <InspectionDrawer report={report} mode="file" filename={currentFile.name} />
        </div>
      )}
    </div>
  );
};
