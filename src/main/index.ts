import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { registerIpcHandlers } from './ipc-handlers';
import { SettingsStore } from './settings-store';

// ── Debug Logger ──────────────────────────────────────
const logFile = path.join(
  process.env.USERPROFILE || process.env.HOME || '.',
  'Desktop',
  'multiterminal-debug.log'
);

function debugLog(level: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  const msg = `[${timestamp}] [${level}] ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a, null, 2)).join(' ')}\n`;
  try {
    fs.appendFileSync(logFile, msg);
  } catch {}
  if (level === 'ERROR') {
    console.error(msg);
  } else {
    console.log(msg);
  }
}

// Catch all uncaught errors
process.on('uncaughtException', (err) => {
  debugLog('ERROR', 'Uncaught Exception:', err.message, err.stack || '');
});

process.on('unhandledRejection', (reason: any) => {
  debugLog('ERROR', 'Unhandled Rejection:', reason?.message || String(reason), reason?.stack || '');
});

debugLog('INFO', 'Multiterminal starting', { pid: process.pid, platform: process.platform, node: process.version });

// ── App ───────────────────────────────────────────────
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  const settingsStore = new SettingsStore();
  const windowState = settingsStore.getWindowState();

  mainWindow = new BrowserWindow({
    width: windowState?.width ?? 1200,
    height: windowState?.height ?? 800,
    x: windowState?.x,
    y: windowState?.y,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Multiterminal',
    backgroundColor: '#1a1a2e',
  });

  if (windowState?.isMaximized) mainWindow.maximize();

  // Log renderer errors
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) { // warnings and errors
      debugLog('RENDERER', `[${level}] ${message} (${sourceId}:${line})`);
    }
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    debugLog('ERROR', 'Renderer process gone:', details);
  });

  mainWindow.on('close', () => {
    if (!mainWindow) return;
    const bounds = mainWindow.getBounds();
    settingsStore.setWindowState({
      ...bounds,
      isMaximized: mainWindow.isMaximized(),
    });
  });

  registerIpcHandlers(mainWindow);

  if (process.env.NODE_ENV === 'development') {
    debugLog('INFO', 'Loading dev server at http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  debugLog('INFO', 'Window created successfully');
}

app.whenReady().then(() => {
  debugLog('INFO', 'App ready, creating window');
  createWindow();
});

app.on('window-all-closed', () => {
  debugLog('INFO', 'All windows closed, quitting');
  app.quit();
});
