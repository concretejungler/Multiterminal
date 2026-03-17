import { app, BrowserWindow } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc-handlers';
import { SettingsStore } from './settings-store';

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
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
