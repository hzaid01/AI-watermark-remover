import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import { spawn, ChildProcess, execSync } from 'child_process';
import http from 'http';
import net from 'net';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let pythonProcess: ChildProcess | null = null;
let backendPort = 8765;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

/**
 * Find an available TCP port starting from startPort
 */
async function findFreePort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, '127.0.0.1', () => {
      server.once('close', () => resolve(startPort));
      server.close();
    });
    server.on('error', () => {
      resolve(findFreePort(startPort + 1));
    });
  });
}

/**
 * Poll GET /health until backend is ready
 */
async function waitForBackend(port: number, maxRetries = 40): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const ready = await new Promise<boolean>((resolve) => {
        const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: 1000 }, (res) => {
          if (res.statusCode === 200) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
      });
      if (ready) return true;
    } catch {
      // Continue polling
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

/**
 * Check if CLI tool is available on PATH
 */
function checkSystemTool(toolName: string): boolean {
  try {
    const cmd = process.platform === 'win32' ? `where.exe ${toolName}` : `which ${toolName}`;
    const output = execSync(cmd, { stdio: 'pipe' }).toString();
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Spawn the Python backend service
 */
async function startBackend(): Promise<number> {
  backendPort = await findFreePort(8765);
  console.log(`[Main] Starting Python backend on 127.0.0.1:${backendPort}...`);

  const rootPath = app.getAppPath();
  const backendName = process.platform === 'win32' ? 'server.exe' : 'server';
  const packagedBackendPath = path.join(process.resourcesPath, 'bin', backendName);
  const localBackendPath = path.join(rootPath, 'resources', 'bin', backendName);
  const pythonScript = isDev
    ? path.join(rootPath, 'service', 'scripts', 'server.py')
    : path.join(process.resourcesPath, 'service', 'scripts', 'server.py');
  const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';

  const env = {
    ...process.env,
    WATERMARKS_SERVER_HOST: '127.0.0.1',
    WATERMARKS_SERVER_PORT: String(backendPort),
    PYTHONIOENCODING: 'utf-8',
    PYTHONUNBUFFERED: '1',
  };

  if (!isDev && fs.existsSync(packagedBackendPath)) {
    console.log(`[Main] Spawning frozen binary from resources: ${packagedBackendPath}`);
    pythonProcess = spawn(packagedBackendPath, ['--host', '127.0.0.1', '--port', String(backendPort)], { env });
  } else if (isDev && fs.existsSync(localBackendPath)) {
    console.log(`[Main] Spawning local binary: ${localBackendPath}`);
    pythonProcess = spawn(localBackendPath, ['--host', '127.0.0.1', '--port', String(backendPort)], { env });
  } else {
    console.log(`[Main] Spawning Python backend: ${pythonScript}`);
    pythonProcess = spawn(pythonCommand, [pythonScript, '--host', '127.0.0.1', '--port', String(backendPort)], {
      env,
      cwd: path.dirname(pythonScript),
    });
  }

  pythonProcess.stdout?.on('data', (data) => {
    console.log(`[Python Backend stdout] ${data.toString().trim()}`);
  });

  pythonProcess.stderr?.on('data', (data) => {
    console.warn(`[Python Backend stderr] ${data.toString().trim()}`);
  });

  pythonProcess.on('error', (err) => {
    console.error('[Main] Failed to spawn Python backend:', err);
  });

  pythonProcess.on('exit', (code, signal) => {
    console.log(`[Main] Python backend exited with code ${code} signal ${signal}`);
  });

  const isReady = await waitForBackend(backendPort);
  if (!isReady) {
    console.error('[Main] Python backend healthcheck timed out.');
  } else {
    console.log('[Main] Python backend is healthy and ready.');
  }

  return backendPort;
}

function createWindow(port: number) {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#090d16',
    frame: false,
    titleBarStyle: 'hidden',
    title: 'Document & Text Cleaner',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    http.get('http://localhost:5173', () => {
      mainWindow?.loadURL('http://localhost:5173');
    }).on('error', () => {
      const distIndex = path.join(__dirname, '../dist/index.html');
      if (fs.existsSync(distIndex)) {
        mainWindow?.loadFile(distIndex);
      } else {
        mainWindow?.loadURL('http://localhost:5173');
      }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIpc() {
  // Window controls
  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle('window:close', () => mainWindow?.close());
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() || false);

  // App status and backend port
  ipcMain.handle('backend:getPort', () => backendPort);
  ipcMain.handle('backend:getUrl', () => `http://127.0.0.1:${backendPort}`);

  // System tools detection (qpdf, exiftool)
  ipcMain.handle('system:checkTools', () => {
    const hasQpdf = checkSystemTool('qpdf');
    const hasExiftool = checkSystemTool('exiftool');
    return {
      qpdf: hasQpdf,
      exiftool: hasExiftool,
    };
  });

  // Open link in external browser
  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    await shell.openExternal(url);
  });

  // Native Open File Dialog
  ipcMain.handle('dialog:openFile', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        {
          name: 'Supported Documents & Text',
          extensions: ['docx', 'pdf', 'odt', 'html', 'htm', 'md', 'markdown', 'txt'],
        },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const filePath = result.filePaths[0];
    const buffer = fs.readFileSync(filePath);
    return {
      path: filePath,
      name: path.basename(filePath),
      size: buffer.length,
      base64: buffer.toString('base64'),
    };
  });

  // Native Select Output Directory Dialog
  ipcMain.handle('dialog:selectDirectory', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // Native Save File Dialog
  ipcMain.handle(
    'dialog:saveCleanedFile',
    async (_, { defaultName, base64Content, customOutputDir }: { defaultName: string; base64Content: string; customOutputDir?: string }) => {
      if (!mainWindow) return { success: false, error: 'No active window' };

      let targetPath = '';
      if (customOutputDir && fs.existsSync(customOutputDir)) {
        targetPath = path.join(customOutputDir, defaultName);
      } else {
        const result = await dialog.showSaveDialog(mainWindow, {
          defaultPath: defaultName,
          filters: [
            { name: 'All Files', extensions: ['*'] }
          ]
        });
        if (result.canceled || !result.filePath) {
          return { success: false, error: 'Save canceled' };
        }
        targetPath = result.filePath;
      }

      try {
        const buffer = Buffer.from(base64Content, 'base64');
        fs.writeFileSync(targetPath, buffer);
        return { success: true, savedPath: targetPath };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Failed to write file' };
      }
    }
  );

  // Read file from path (for drag and drop)
  ipcMain.handle('file:readFromPath', async (_, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File does not exist' };
      }
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        return { success: false, error: 'Directories are not supported' };
      }
      const buffer = fs.readFileSync(filePath);
      return {
        success: true,
        file: {
          path: filePath,
          name: path.basename(filePath),
          size: buffer.length,
          base64: buffer.toString('base64'),
        },
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Could not read file' };
    }
  });
}

function cleanupBackend() {
  if (pythonProcess && !pythonProcess.killed) {
    console.log('[Main] Terminating Python backend...');
    pythonProcess.kill('SIGTERM');
    pythonProcess = null;
  }
}

app.whenReady().then(async () => {
  setupIpc();
  const port = await startBackend();
  createWindow(port);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(port);
    }
  });
});

app.on('before-quit', () => {
  cleanupBackend();
});

app.on('window-all-closed', () => {
  cleanupBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
