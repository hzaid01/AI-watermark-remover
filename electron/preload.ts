import { contextBridge, ipcRenderer } from 'electron';

export interface FileData {
  path: string;
  name: string;
  size: number;
  base64: string;
}

export interface ElectronAPI {
  // Window controls
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;

  // Backend details
  getBackendPort: () => Promise<number>;
  getBackendUrl: () => Promise<string>;

  // System tools diagnostics
  checkTools: () => Promise<{ qpdf: boolean; exiftool: boolean }>;

  // Shell
  openExternal: (url: string) => Promise<void>;

  // Dialogs
  openFileDialog: () => Promise<FileData | null>;
  selectDirectoryDialog: () => Promise<string | null>;
  saveCleanedFile: (args: {
    defaultName: string;
    base64Content: string;
    customOutputDir?: string;
  }) => Promise<{ success: boolean; savedPath?: string; error?: string }>;
  readFilePath: (filePath: string) => Promise<{ success: boolean; file?: FileData; error?: string }>;
}

const api: ElectronAPI = {
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  getBackendPort: () => ipcRenderer.invoke('backend:getPort'),
  getBackendUrl: () => ipcRenderer.invoke('backend:getUrl'),

  checkTools: () => ipcRenderer.invoke('system:checkTools'),

  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  selectDirectoryDialog: () => ipcRenderer.invoke('dialog:selectDirectory'),
  saveCleanedFile: (args) => ipcRenderer.invoke('dialog:saveCleanedFile', args),
  readFilePath: (filePath: string) => ipcRenderer.invoke('file:readFromPath', filePath),
};

contextBridge.exposeInMainWorld('electronAPI', api);
