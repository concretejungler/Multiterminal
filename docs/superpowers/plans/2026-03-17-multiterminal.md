# Multiterminal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Electron desktop app that manages multiple Claude Code terminal instances with tabs, split panes, command queuing, plan tracking, notifications, skill/MCP config, git push, and clipboard history.

**Architecture:** Electron main process manages PTY instances (node-pty), status parsing, command queues, and persistence (electron-store). React renderer with Zustand renders xterm.js terminals in a tabbed/split-pane layout. IPC via contextBridge connects the two.

**Tech Stack:** Electron 33+, React 19, Tailwind CSS 4, xterm.js 5, node-pty, Zustand, electron-store, Vite, electron-builder, TypeScript

---

## File Structure

```
src/
├── main/
│   ├── index.ts               — Electron app entry, creates BrowserWindow, registers IPC
│   ├── pty-manager.ts         — Spawns/kills node-pty processes, strips ANSI, parses status/idle
│   ├── queue-manager.ts       — Watches idle state, dispatches queued commands
│   ├── notification-manager.ts — Plays sounds via Electron, fires OS toast notifications
│   ├── git-manager.ts         — Runs git commands (status, commit, push) via child_process
│   ├── settings-store.ts      — Wraps electron-store for all settings/instance configs
│   ├── clipboard-store.ts     — Logs paste events, provides search/retrieval
│   ├── ipc-handlers.ts        — Registers all ipcMain.handle/on listeners, delegates to managers
│   └── preload.ts             — contextBridge.exposeInMainWorld API surface
├── renderer/
│   ├── index.html             — Vite HTML entry
│   ├── main.tsx               — React root render
│   ├── App.tsx                — Root component, provides layout shell
│   ├── store/
│   │   ├── instances.ts       — Zustand store: instance list, status, queues
│   │   ├── settings.ts        — Zustand store: global/per-instance settings
│   │   ├── clipboard.ts       — Zustand store: paste history
│   │   └── layout.ts          — Zustand store: pane layout tree, active tab
│   ├── components/
│   │   ├── AppShell.tsx       — Top bar (tabs, buttons), sidebar slot, pane area
│   │   ├── TabBar.tsx         — Tab strip with status icons, [+], [⚙], drag handlers
│   │   ├── SplitPaneContainer.tsx — Recursive split layout from layout store tree
│   │   ├── TerminalPane.tsx   — Composes StatusBar + TerminalView + PlanChecklist + CommandQueue + InputBar
│   │   ├── StatusBar.tsx      — Progress bar, task text, bell toggle, instance name
│   │   ├── TerminalView.tsx   — xterm.js Terminal + fit addon + web-links addon
│   │   ├── PlanChecklist.tsx  — Renders parsed plan items, collapsible, empty state
│   │   ├── CommandQueue.tsx   — Ordered command list, drag reorder, remove, add
│   │   ├── InputBar.tsx       — Text input, Send, Ctrl+Enter to queue, Skip Permissions button
│   │   ├── SettingsSidebar.tsx — Slide-out panel with global settings, skills/MCP, presets
│   │   ├── SkillsMcpPanel.tsx — Toggle grid for skills and MCP servers
│   │   ├── WorkflowPresets.tsx — Preset cards (Debugging, Security, E2E, custom)
│   │   ├── ClipboardHistory.tsx — Searchable paste log panel
│   │   ├── GitPushDialog.tsx  — Modal: branch, commit message, push action
│   │   └── NewInstanceDialog.tsx — Modal: name, working dir, permissions mode
│   └── hooks/
│       ├── useTerminal.ts     — Creates/destroys xterm.js Terminal, attaches addons
│       └── usePty.ts          — IPC bridge: send input, receive data/status/errors
└── shared/
    ├── types.ts               — All TypeScript interfaces (Instance, QueueItem, Settings, etc.)
    └── constants.ts           — IPC channel names, default settings values, regex patterns
```

---

## Task 1: Project Scaffolding & Electron Shell

**Files:**
- Create: `package.json`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.main.json`
- Create: `electron-builder.yml`
- Create: `src/main/index.ts`
- Create: `src/main/preload.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/shared/types.ts`
- Create: `src/shared/constants.ts`

- [ ] **Step 1: Initialize npm project and install dependencies**

**Prerequisites:** On Windows, node-pty requires Visual Studio Build Tools (C++ workload). Install from https://visualstudio.microsoft.com/visual-cpp-build-tools/ if `npm install` fails on node-pty.

```bash
npm init -y
npm install electron electron-builder --save-dev
npm install react react-dom @types/react @types/react-dom typescript --save-dev
npm install vite @vitejs/plugin-react --save-dev
npm install tailwindcss @tailwindcss/vite --save-dev
npm install node-pty @xterm/xterm @xterm/addon-fit @xterm/addon-web-links
npm install zustand electron-store@8
npm install strip-ansi@6
npm install concurrently wait-on --save-dev
```

**Note:** `@xterm/xterm` is the v5 package name (not `xterm`). `strip-ansi@6` and `electron-store@8` are pinned to the last CJS-compatible versions since the Electron main process compiles to CommonJS.

- [ ] **Step 2: Create TypeScript config**

Create `tsconfig.json` (base config for renderer):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "paths": {
      "@renderer/*": ["./src/renderer/*"],
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": ["src/renderer/**/*", "src/shared/**/*"]
}
```

Create `tsconfig.main.json` (main process, compiles to CJS for Electron):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist/main",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false
  },
  "include": ["src/main/**/*", "src/shared/**/*"]
}
```

**Note:** `tsconfig.main.json` includes `src/shared/**/*` so that the main process can import from `../shared/constants` etc. The outDir mirrors the source structure under `dist/main/`.

- [ ] **Step 3: Create shared types and constants**

Create `src/shared/types.ts`:
```typescript
export interface Instance {
  id: string;
  name: string;
  workingDirectory: string;
  skipPermissions: boolean;
  status: 'idle' | 'working' | 'waiting-for-input' | 'error' | 'stopped';
  taskDescription: string;
  progressPercent: number | null; // null = indeterminate
  planItems: PlanItem[];
  queue: QueueItem[];
  soundEnabled: boolean;
}

export interface PlanItem {
  text: string;
  completed: boolean;
}

export interface QueueItem {
  id: string;
  type: 'command' | 'git-push';
  command?: string;
}

export interface GlobalSettings {
  defaultWorkingDirectory: string;
  soundEnabled: boolean;
  soundChoice: 'chime' | 'bell' | 'ding';
  soundVolume: number;
  theme: 'dark' | 'light';
  defaultSkipPermissions: boolean;
  githubDefaultBranch: string;
  scrollbackLines: number;
}

export interface SkillsMcpConfig {
  globalSkills: Record<string, boolean>;
  globalMcp: Record<string, boolean>;
  perInstance: Record<string, {
    useGlobalDefaults: boolean;
    skills: Record<string, boolean>;
    mcp: Record<string, boolean>;
  }>;
}

export interface PasteEntry {
  id: string;
  timestamp: number;
  text: string;
  instanceId: string;
  instanceName: string;
}

export interface WindowState {
  width: number;
  height: number;
  x: number;
  y: number;
  isMaximized: boolean;
}
```

Create `src/shared/constants.ts`:
```typescript
export const IPC = {
  PTY_CREATE: 'pty:create',
  PTY_DATA: 'pty:data',
  PTY_INPUT: 'pty:input',
  PTY_RESIZE: 'pty:resize',
  PTY_KILL: 'pty:kill',
  PTY_ERROR: 'pty:error',
  PTY_RESTART: 'pty:restart',
  PTY_STATUS: 'pty:status',
  QUEUE_SEND_NEXT: 'queue:send-next',
  NOTIFICATION_DONE: 'notification:done',
  GIT_PUSH: 'git:push',
  GIT_RESULT: 'git:result',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  CLIPBOARD_LOG: 'clipboard:log',
  CLIPBOARD_HISTORY: 'clipboard:history',
} as const;

export const DEFAULTS: import('./types').GlobalSettings = {
  defaultWorkingDirectory: '',
  soundEnabled: true,
  soundChoice: 'chime',
  soundVolume: 0.7,
  theme: 'dark',
  defaultSkipPermissions: false,
  githubDefaultBranch: 'main',
  scrollbackLines: 10000,
};

export const MAX_INSTANCES = 8;
export const WARN_INSTANCES = 6;
export const MAX_PASTE_HISTORY = 1000;
export const IDLE_DEBOUNCE_MS = 2000;
export const IDLE_SILENCE_MS = 5000;

// Prompt patterns for idle detection (Claude Code prompt)
export const PROMPT_PATTERNS = [
  /❯\s*$/m,
  /\$\s*$/m,
  />\s*$/m,
];

// Permission prompt patterns
export const PERMISSION_PATTERNS = [
  /Allow|Deny/i,
  /\(Y\/n\)/i,
  /\[y\/N\]/i,
];

// Plan item patterns
export const PLAN_PATTERNS = [
  /^[\s]*-\s*\[([ xX✓✗])\]\s*(.+)$/gm,
  /^[\s]*(\d+)\.\s+(.+)$/gm,
  /^[\s]*Step\s+(\d+)[:\s]+(.+)$/gim,
];

// Status text patterns
export const STATUS_PATTERNS = [
  /(?:Working on|Creating|Running|Implementing|Fixing|Writing|Reading|Searching)\s+(.+)/i,
];
```

- [ ] **Step 4: Create Electron main process entry**

Create `src/main/index.ts`:
```typescript
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

  // Save window state on close
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
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
```

- [ ] **Step 5: Create preload script**

Create `src/main/preload.ts`:
```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/constants';

contextBridge.exposeInMainWorld('api', {
  // PTY
  createPty: (config: { id: string; workingDirectory: string; skipPermissions: boolean }) =>
    ipcRenderer.invoke(IPC.PTY_CREATE, config),
  sendInput: (id: string, data: string) =>
    ipcRenderer.send(IPC.PTY_INPUT, id, data),
  resizePty: (id: string, cols: number, rows: number) =>
    ipcRenderer.send(IPC.PTY_RESIZE, id, cols, rows),
  killPty: (id: string) =>
    ipcRenderer.invoke(IPC.PTY_KILL, id),
  restartPty: (id: string) =>
    ipcRenderer.invoke(IPC.PTY_RESTART, id),

  // Listeners
  onPtyData: (callback: (id: string, data: string) => void) => {
    const listener = (_: any, id: string, data: string) => callback(id, data);
    ipcRenderer.on(IPC.PTY_DATA, listener);
    return () => ipcRenderer.removeListener(IPC.PTY_DATA, listener);
  },
  onPtyStatus: (callback: (id: string, status: any) => void) => {
    const listener = (_: any, id: string, status: any) => callback(id, status);
    ipcRenderer.on(IPC.PTY_STATUS, listener);
    return () => ipcRenderer.removeListener(IPC.PTY_STATUS, listener);
  },
  onPtyError: (callback: (id: string, error: any) => void) => {
    const listener = (_: any, id: string, error: any) => callback(id, error);
    ipcRenderer.on(IPC.PTY_ERROR, listener);
    return () => ipcRenderer.removeListener(IPC.PTY_ERROR, listener);
  },
  onQueueSendNext: (callback: (id: string) => void) => {
    const listener = (_: any, id: string) => callback(id);
    ipcRenderer.on(IPC.QUEUE_SEND_NEXT, listener);
    return () => ipcRenderer.removeListener(IPC.QUEUE_SEND_NEXT, listener);
  },
  onNotificationDone: (callback: (id: string) => void) => {
    const listener = (_: any, id: string) => callback(id);
    ipcRenderer.on(IPC.NOTIFICATION_DONE, listener);
    return () => ipcRenderer.removeListener(IPC.NOTIFICATION_DONE, listener);
  },

  // Settings
  getSettings: () => ipcRenderer.invoke(IPC.SETTINGS_GET),
  setSettings: (settings: any) => ipcRenderer.invoke(IPC.SETTINGS_SET, settings),

  // Git
  gitPush: (config: any) => ipcRenderer.invoke(IPC.GIT_PUSH, config),

  // Clipboard
  logPaste: (entry: any) => ipcRenderer.send(IPC.CLIPBOARD_LOG, entry),
  getClipboardHistory: () => ipcRenderer.invoke(IPC.CLIPBOARD_HISTORY),

  // Queue management
  queueAdd: (instanceId: string, item: any) =>
    ipcRenderer.invoke('queue:add', instanceId, item),
  queueRemove: (instanceId: string, itemId: string) =>
    ipcRenderer.invoke('queue:remove', instanceId, itemId),
  queueReorder: (instanceId: string, itemIds: string[]) =>
    ipcRenderer.invoke('queue:reorder', instanceId, itemIds),
  queueGet: (instanceId: string) =>
    ipcRenderer.invoke('queue:get', instanceId),

  // Force idle
  forceIdle: (id: string) =>
    ipcRenderer.invoke('pty:force-idle', id),
});
```

- [ ] **Step 6: Create Vite config for Electron + React**

Create `vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: 'src/renderer',
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
});
```

- [ ] **Step 7: Create minimal React app with dark theme**

Create `src/renderer/index.html`:
```html
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Multiterminal</title>
</head>
<body class="bg-gray-950 text-gray-100">
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

Create `src/renderer/main.tsx`:
```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<App />);
```

Create `src/renderer/styles.css`:
```css
@import 'tailwindcss';
```

Create `src/renderer/App.tsx`:
```tsx
import { AppShell } from './components/AppShell';

export default function App() {
  return <AppShell />;
}
```

Create `src/renderer/components/AppShell.tsx` — placeholder:
```tsx
export function AppShell() {
  return (
    <div className="flex flex-col h-screen bg-gray-950">
      <div className="flex items-center h-10 bg-gray-900 border-b border-gray-800 px-2">
        <span className="text-sm text-gray-400">Multiterminal</span>
      </div>
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Click [+] to start a new Claude instance
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Add npm scripts and verify dev server starts**

Update `package.json` scripts:
```json
{
  "main": "dist/main/main/index.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\"",
    "dev:renderer": "vite",
    "dev:main": "tsc -p tsconfig.main.json --watch",
    "dev:electron": "wait-on http://localhost:5173 && electron .",
    "build": "npm run build:renderer && npm run build:main",
    "build:renderer": "vite build",
    "build:main": "tsc -p tsconfig.main.json",
    "start": "electron .",
    "package": "npm run build && electron-builder"
  }
}
```

**Note:** `main` path is `dist/main/main/index.js` because `tsconfig.main.json` has `rootDir: "src"` and `outDir: "dist/main"`, so `src/main/index.ts` compiles to `dist/main/main/index.js`. The `dev:electron` script waits for Vite before starting Electron.

Run: `npm run dev:renderer` — verify Vite starts on port 5173.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Electron + React + Tailwind project with types and IPC"
```

---

## Task 2: Settings Store & Persistence

**Files:**
- Create: `src/main/settings-store.ts`

- [ ] **Step 1: Implement SettingsStore class**

```typescript
import Store from 'electron-store';
import { GlobalSettings, SkillsMcpConfig, WindowState } from '../shared/types';
import { DEFAULTS } from '../shared/constants';

export class SettingsStore {
  private store: Store;

  constructor() {
    this.store = new Store({ name: 'multiterminal-settings' });
  }

  getGlobalSettings(): GlobalSettings {
    return this.store.get('global', DEFAULTS) as GlobalSettings;
  }

  setGlobalSettings(settings: Partial<GlobalSettings>): void {
    const current = this.getGlobalSettings();
    this.store.set('global', { ...current, ...settings });
  }

  getSkillsMcpConfig(): SkillsMcpConfig {
    return this.store.get('skillsMcp', {
      globalSkills: {},
      globalMcp: {},
      perInstance: {},
    }) as SkillsMcpConfig;
  }

  setSkillsMcpConfig(config: SkillsMcpConfig): void {
    this.store.set('skillsMcp', config);
  }

  getWindowState(): WindowState | null {
    return this.store.get('windowState', null) as WindowState | null;
  }

  setWindowState(state: WindowState): void {
    this.store.set('windowState', state);
  }

  getInstanceQueues(): Record<string, import('../shared/types').QueueItem[]> {
    return this.store.get('instanceQueues', {}) as Record<string, any[]>;
  }

  setInstanceQueues(queues: Record<string, import('../shared/types').QueueItem[]>): void {
    this.store.set('instanceQueues', queues);
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -p tsconfig.main.json --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/main/settings-store.ts
git commit -m "feat: add SettingsStore with electron-store persistence"
```

---

## Task 3: PTY Manager — Spawn & Stream

**Files:**
- Create: `src/main/pty-manager.ts`

- [ ] **Step 1: Implement PtyManager with spawn/kill/resize**

```typescript
import { spawn, IPty } from 'node-pty';
import { BrowserWindow } from 'electron';
import stripAnsi from 'strip-ansi';
import { IPC, PROMPT_PATTERNS, PERMISSION_PATTERNS, STATUS_PATTERNS, PLAN_PATTERNS, IDLE_DEBOUNCE_MS, IDLE_SILENCE_MS } from '../shared/constants';
import { PlanItem } from '../shared/types';

interface PtyInstance {
  pty: IPty;
  id: string;
  status: 'idle' | 'working' | 'waiting-for-input' | 'error' | 'stopped';
  lastOutputTime: number;
  idleTimer: ReturnType<typeof setTimeout> | null;
  silenceTimer: ReturnType<typeof setTimeout> | null;
  outputBuffer: string;
  taskDescription: string;
  progressPercent: number | null;
  planItems: PlanItem[];
}

export class PtyManager {
  private instances = new Map<string, PtyInstance>();
  private window: BrowserWindow;
  private idleListeners: Array<(id: string) => void> = [];

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  onIdle(callback: (id: string) => void) {
    this.idleListeners.push(callback);
  }

  private emitIdle(id: string) {
    for (const listener of this.idleListeners) {
      listener(id);
    }
  }

  spawn(id: string, workingDirectory: string, skipPermissions: boolean): void {
    const args = skipPermissions ? ['--dangerously-skip-permissions'] : [];

    let pty: IPty;
    try {
      pty = spawn('claude', args, {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd: workingDirectory || process.env.HOME || process.env.USERPROFILE || '.',
        env: process.env as Record<string, string>,
      });
    } catch (err: any) {
      this.window.webContents.send(IPC.PTY_ERROR, id, {
        type: 'spawn-failed',
        message: err.message?.includes('ENOENT')
          ? 'Claude Code CLI not found. Install it and restart.'
          : err.message,
      });
      return;
    }

    const instance: PtyInstance = {
      pty,
      id,
      status: 'working',
      lastOutputTime: Date.now(),
      idleTimer: null,
      silenceTimer: null,
      outputBuffer: '',
      taskDescription: '',
      progressPercent: null,
      planItems: [],
    };

    pty.onData((data: string) => {
      instance.lastOutputTime = Date.now();
      instance.outputBuffer += data;

      // Keep buffer manageable (last 5000 chars for parsing)
      if (instance.outputBuffer.length > 10000) {
        instance.outputBuffer = instance.outputBuffer.slice(-5000);
      }

      // Stream raw data to renderer for xterm.js
      this.window.webContents.send(IPC.PTY_DATA, id, data);

      // Parse status from stripped output
      this.parseStatus(instance);
    });

    pty.onExit(({ exitCode }) => {
      instance.status = 'stopped';
      this.clearTimers(instance);
      if (exitCode !== 0) {
        this.window.webContents.send(IPC.PTY_ERROR, id, {
          type: 'crash',
          exitCode,
          message: `Claude instance crashed (exit code ${exitCode})`,
        });
      }
      this.sendStatusUpdate(instance);
    });

    this.instances.set(id, instance);
  }

  private parseStatus(instance: PtyInstance): void {
    const stripped = stripAnsi(instance.outputBuffer);

    // Check for permission prompts first
    for (const pattern of PERMISSION_PATTERNS) {
      if (pattern.test(stripped.slice(-200))) {
        if (instance.status !== 'waiting-for-input') {
          instance.status = 'waiting-for-input';
          this.clearTimers(instance);
          this.sendStatusUpdate(instance);
        }
        return;
      }
    }

    // Parse task description
    for (const pattern of STATUS_PATTERNS) {
      const match = stripped.slice(-500).match(pattern);
      if (match) {
        instance.taskDescription = match[1].trim().slice(0, 100);
        instance.status = 'working';
        break;
      }
    }

    // Parse plan items
    const planItems: PlanItem[] = [];
    const checkboxRegex = /^[\s]*-\s*\[([ xX✓✗])\]\s*(.+)$/gm;
    let planMatch;
    while ((planMatch = checkboxRegex.exec(stripped)) !== null) {
      planItems.push({
        text: planMatch[2].trim(),
        completed: planMatch[1] !== ' ',
      });
    }
    if (planItems.length > 0) {
      instance.planItems = planItems;
      const completed = planItems.filter(p => p.completed).length;
      instance.progressPercent = Math.round((completed / planItems.length) * 100);
    }

    // Check for idle (prompt pattern)
    const lastChunk = stripped.slice(-100);
    const promptDetected = PROMPT_PATTERNS.some(p => p.test(lastChunk));

    if (promptDetected) {
      this.startIdleDebounce(instance);
    } else {
      // Reset silence timer on new output
      this.resetSilenceTimer(instance);
    }

    this.sendStatusUpdate(instance);
  }

  private startIdleDebounce(instance: PtyInstance): void {
    this.clearTimers(instance);
    instance.idleTimer = setTimeout(() => {
      if (instance.status !== 'idle' && instance.status !== 'stopped') {
        instance.status = 'idle';
        this.sendStatusUpdate(instance);
        this.emitIdle(instance.id);
      }
    }, IDLE_DEBOUNCE_MS);
  }

  private resetSilenceTimer(instance: PtyInstance): void {
    if (instance.silenceTimer) clearTimeout(instance.silenceTimer);
    instance.status = 'working';
    instance.silenceTimer = setTimeout(() => {
      // No output for IDLE_SILENCE_MS — check if prompt is showing
      const stripped = stripAnsi(instance.outputBuffer);
      const lastChunk = stripped.slice(-100);
      if (PROMPT_PATTERNS.some(p => p.test(lastChunk))) {
        this.startIdleDebounce(instance);
      }
    }, IDLE_SILENCE_MS);
  }

  private clearTimers(instance: PtyInstance): void {
    if (instance.idleTimer) clearTimeout(instance.idleTimer);
    if (instance.silenceTimer) clearTimeout(instance.silenceTimer);
    instance.idleTimer = null;
    instance.silenceTimer = null;
  }

  private sendStatusUpdate(instance: PtyInstance): void {
    this.window.webContents.send(IPC.PTY_STATUS, instance.id, {
      status: instance.status,
      taskDescription: instance.taskDescription,
      progressPercent: instance.progressPercent,
      planItems: instance.planItems,
    });
  }

  write(id: string, data: string): void {
    this.instances.get(id)?.pty.write(data);
  }

  resize(id: string, cols: number, rows: number): void {
    this.instances.get(id)?.pty.resize(cols, rows);
  }

  kill(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      this.clearTimers(instance);
      instance.pty.kill();
      this.instances.delete(id);
    }
  }

  forceIdle(id: string): void {
    const instance = this.instances.get(id);
    if (instance) {
      instance.status = 'idle';
      this.clearTimers(instance);
      this.sendStatusUpdate(instance);
      this.emitIdle(instance.id);
    }
  }

  getStatus(id: string) {
    const instance = this.instances.get(id);
    if (!instance) return null;
    return {
      status: instance.status,
      taskDescription: instance.taskDescription,
      progressPercent: instance.progressPercent,
      planItems: instance.planItems,
    };
  }

  killAll(): void {
    for (const [id] of this.instances) {
      this.kill(id);
    }
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -p tsconfig.main.json --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/main/pty-manager.ts
git commit -m "feat: add PtyManager with spawn, stream, idle detection, status parsing"
```

---

## Task 4: Queue Manager

**Files:**
- Create: `src/main/queue-manager.ts`

- [ ] **Step 1: Implement QueueManager**

```typescript
import { BrowserWindow } from 'electron';
import { PtyManager } from './pty-manager';
import { SettingsStore } from './settings-store';
import { GitManager } from './git-manager';
import { IPC } from '../shared/constants';
import { QueueItem } from '../shared/types';

export class QueueManager {
  private queues = new Map<string, QueueItem[]>();
  private window: BrowserWindow;
  private ptyManager: PtyManager;
  private settingsStore: SettingsStore;
  private gitManager: GitManager;

  constructor(
    window: BrowserWindow,
    ptyManager: PtyManager,
    settingsStore: SettingsStore,
    gitManager: GitManager,
  ) {
    this.window = window;
    this.ptyManager = ptyManager;
    this.settingsStore = settingsStore;
    this.gitManager = gitManager;

    // Restore saved queues
    const saved = settingsStore.getInstanceQueues();
    for (const [id, items] of Object.entries(saved)) {
      this.queues.set(id, items);
    }

    // Listen for idle events
    ptyManager.onIdle((id) => this.processNext(id));
  }

  addToQueue(instanceId: string, item: QueueItem): void {
    if (!this.queues.has(instanceId)) this.queues.set(instanceId, []);
    this.queues.get(instanceId)!.push(item);
    this.saveQueues();
  }

  removeFromQueue(instanceId: string, itemId: string): void {
    const queue = this.queues.get(instanceId);
    if (queue) {
      const idx = queue.findIndex(q => q.id === itemId);
      if (idx !== -1) queue.splice(idx, 1);
      this.saveQueues();
    }
  }

  reorderQueue(instanceId: string, itemIds: string[]): void {
    const queue = this.queues.get(instanceId);
    if (!queue) return;
    const reordered = itemIds.map(id => queue.find(q => q.id === id)).filter(Boolean) as QueueItem[];
    this.queues.set(instanceId, reordered);
    this.saveQueues();
  }

  getQueue(instanceId: string): QueueItem[] {
    return this.queues.get(instanceId) || [];
  }

  private async processNext(instanceId: string): Promise<void> {
    const queue = this.queues.get(instanceId);
    if (!queue || queue.length === 0) return;

    const next = queue.shift()!;
    this.saveQueues();

    if (next.type === 'git-push') {
      const status = this.ptyManager.getStatus(instanceId);
      try {
        // Use working directory from the instance
        await this.gitManager.commitAndPush({
          workingDirectory: '.', // will be resolved per-instance
          branch: this.settingsStore.getGlobalSettings().githubDefaultBranch,
          message: 'auto-commit from Multiterminal',
        });
        this.window.webContents.send(IPC.GIT_RESULT, { success: true });
      } catch (err: any) {
        this.window.webContents.send(IPC.GIT_RESULT, { success: false, error: err.message });
      }
      // Continue to next queue item
      this.processNext(instanceId);
    } else if (next.command) {
      this.ptyManager.write(instanceId, next.command + '\n');
      this.window.webContents.send(IPC.QUEUE_SEND_NEXT, instanceId);
    }
  }

  private saveQueues(): void {
    const obj: Record<string, QueueItem[]> = {};
    for (const [id, queue] of this.queues) {
      if (queue.length > 0) obj[id] = queue;
    }
    this.settingsStore.setInstanceQueues(obj);
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -p tsconfig.main.json --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/main/queue-manager.ts
git commit -m "feat: add QueueManager with auto-dispatch on idle"
```

---

## Task 5: Notification Manager

**Files:**
- Create: `src/main/notification-manager.ts`
- Create: `assets/sounds/` (3 audio files)

- [ ] **Step 1: Create notification manager**

```typescript
import { Notification, BrowserWindow } from 'electron';
import path from 'path';
import { SettingsStore } from './settings-store';
import { IPC } from '../shared/constants';

export class NotificationManager {
  private window: BrowserWindow;
  private settingsStore: SettingsStore;
  private mutedInstances = new Set<string>();

  constructor(window: BrowserWindow, settingsStore: SettingsStore) {
    this.window = window;
    this.settingsStore = settingsStore;
  }

  setInstanceMuted(id: string, muted: boolean): void {
    if (muted) this.mutedInstances.add(id);
    else this.mutedInstances.delete(id);
  }

  notifyDone(instanceId: string, instanceName: string): void {
    const settings = this.settingsStore.getGlobalSettings();
    if (!settings.soundEnabled || this.mutedInstances.has(instanceId)) return;

    // Play sound via renderer (Web Audio API)
    this.window.webContents.send(IPC.NOTIFICATION_DONE, instanceId, {
      sound: settings.soundChoice,
      volume: settings.soundVolume,
    });

    // OS toast
    const notification = new Notification({
      title: 'Multiterminal',
      body: `${instanceName} has finished working`,
    });
    notification.on('click', () => {
      this.window.show();
      this.window.focus();
    });
    notification.show();
  }
}
```

- [ ] **Step 2: Add placeholder sound files**

Create `assets/sounds/` directory. We'll generate simple tone audio files using a script or use free CC0 notification sounds. For now create empty placeholders:

```bash
mkdir -p assets/sounds
# These will be replaced with actual audio files
touch assets/sounds/chime.mp3 assets/sounds/bell.mp3 assets/sounds/ding.mp3
```

- [ ] **Step 3: Commit**

```bash
git add src/main/notification-manager.ts assets/sounds/
git commit -m "feat: add NotificationManager with OS toast and sound playback"
```

---

## Task 6: Git Manager

**Files:**
- Create: `src/main/git-manager.ts`

- [ ] **Step 1: Implement GitManager**

```typescript
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

interface GitPushConfig {
  workingDirectory: string;
  branch: string;
  message: string;
}

interface GitStatus {
  branch: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export class GitManager {
  private async git(args: string[], cwd: string): Promise<string> {
    try {
      const { stdout } = await execFileAsync('git', args, { cwd, timeout: 30000 });
      return stdout.trim();
    } catch (err: any) {
      throw new Error(err.stderr?.trim() || err.message);
    }
  }

  async getStatus(workingDirectory: string): Promise<GitStatus> {
    const branch = await this.git(['branch', '--show-current'], workingDirectory);
    const status = await this.git(['status', '--porcelain'], workingDirectory);

    const lines = status.split('\n').filter(Boolean);
    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];

    for (const line of lines) {
      const indexStatus = line[0];
      const workStatus = line[1];
      const file = line.slice(3);

      if (indexStatus === '?') untracked.push(file);
      else if (indexStatus !== ' ') staged.push(file);
      if (workStatus !== ' ' && workStatus !== '?') unstaged.push(file);
    }

    return { branch, staged, unstaged, untracked };
  }

  async getBranches(workingDirectory: string): Promise<string[]> {
    const output = await this.git(['branch', '--list', '--format=%(refname:short)'], workingDirectory);
    return output.split('\n').filter(Boolean);
  }

  async commitAndPush(config: GitPushConfig): Promise<void> {
    const { workingDirectory, branch, message } = config;

    // Stage all changes
    await this.git(['add', '-A'], workingDirectory);

    // Check if there's anything to commit
    try {
      await this.git(['diff', '--cached', '--quiet'], workingDirectory);
      // No changes staged — skip commit
    } catch {
      // diff --quiet exits non-zero when there are changes
      await this.git(['commit', '-m', message], workingDirectory);
    }

    // Push
    await this.git(['push', 'origin', branch], workingDirectory);
  }

  async isGitRepo(workingDirectory: string): Promise<boolean> {
    try {
      await this.git(['rev-parse', '--git-dir'], workingDirectory);
      return true;
    } catch {
      return false;
    }
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -p tsconfig.main.json --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/main/git-manager.ts
git commit -m "feat: add GitManager with status, commit, push, error handling"
```

---

## Task 7: Clipboard Store

**Files:**
- Create: `src/main/clipboard-store.ts`

- [ ] **Step 1: Implement ClipboardStore**

```typescript
import Store from 'electron-store';
import { PasteEntry } from '../shared/types';
import { MAX_PASTE_HISTORY } from '../shared/constants';

export class ClipboardStore {
  private store: Store;

  constructor() {
    this.store = new Store({ name: 'multiterminal-clipboard' });
  }

  log(entry: Omit<PasteEntry, 'id'>): void {
    const entries = this.getAll();
    entries.unshift({ ...entry, id: crypto.randomUUID() });
    if (entries.length > MAX_PASTE_HISTORY) {
      entries.length = MAX_PASTE_HISTORY;
    }
    this.store.set('history', entries);
  }

  getAll(): PasteEntry[] {
    return this.store.get('history', []) as PasteEntry[];
  }

  search(query: string): PasteEntry[] {
    const lower = query.toLowerCase();
    return this.getAll().filter(e => e.text.toLowerCase().includes(lower));
  }

  clear(): void {
    this.store.set('history', []);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/main/clipboard-store.ts
git commit -m "feat: add ClipboardStore with paste logging and search"
```

---

## Task 8: IPC Handlers — Wire Everything Together

**Files:**
- Create: `src/main/ipc-handlers.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: Implement IPC handlers**

```typescript
import { ipcMain, BrowserWindow } from 'electron';
import { IPC, MAX_INSTANCES, WARN_INSTANCES } from '../shared/constants';
import { PtyManager } from './pty-manager';
import { QueueManager } from './queue-manager';
import { NotificationManager } from './notification-manager';
import { GitManager } from './git-manager';
import { SettingsStore } from './settings-store';
import { ClipboardStore } from './clipboard-store';

export function registerIpcHandlers(window: BrowserWindow): void {
  const settingsStore = new SettingsStore();
  const gitManager = new GitManager();
  const ptyManager = new PtyManager(window);
  const notificationManager = new NotificationManager(window, settingsStore);
  const queueManager = new QueueManager(window, ptyManager, settingsStore, gitManager);
  const clipboardStore = new ClipboardStore();

  let instanceCount = 0;
  const instanceConfigs = new Map<string, { workingDirectory: string; skipPermissions: boolean }>();

  // Wire idle → notification (QueueManager already registered its own onIdle in constructor)
  ptyManager.onIdle((id) => {
    notificationManager.notifyDone(id, `Instance ${id.slice(0, 6)}`);
  });

  // PTY
  ipcMain.handle(IPC.PTY_CREATE, async (_, config) => {
    if (instanceCount >= MAX_INSTANCES) {
      return { error: 'Maximum instances reached (8).' };
    }
    instanceCount++;
    instanceConfigs.set(config.id, { workingDirectory: config.workingDirectory, skipPermissions: config.skipPermissions });
    ptyManager.spawn(config.id, config.workingDirectory, config.skipPermissions);
    return {
      success: true,
      warning: instanceCount >= WARN_INSTANCES
        ? 'Running many Claude instances uses significant memory.'
        : undefined,
    };
  });

  ipcMain.on(IPC.PTY_INPUT, (_, id: string, data: string) => {
    ptyManager.write(id, data);
  });

  ipcMain.on(IPC.PTY_RESIZE, (_, id: string, cols: number, rows: number) => {
    ptyManager.resize(id, cols, rows);
  });

  ipcMain.handle(IPC.PTY_KILL, async (_, id: string) => {
    ptyManager.kill(id);
    instanceCount = Math.max(0, instanceCount - 1);
  });

  ipcMain.handle(IPC.PTY_RESTART, async (_, id: string) => {
    const config = instanceConfigs.get(id);
    ptyManager.kill(id);
    if (config) {
      ptyManager.spawn(id, config.workingDirectory, config.skipPermissions);
    }
    // instanceCount stays the same since we're restarting, not removing
  });

  // Settings
  ipcMain.handle(IPC.SETTINGS_GET, async () => {
    return {
      global: settingsStore.getGlobalSettings(),
      skillsMcp: settingsStore.getSkillsMcpConfig(),
    };
  });

  ipcMain.handle(IPC.SETTINGS_SET, async (_, settings) => {
    if (settings.global) settingsStore.setGlobalSettings(settings.global);
    if (settings.skillsMcp) settingsStore.setSkillsMcpConfig(settings.skillsMcp);
  });

  // Git
  ipcMain.handle(IPC.GIT_PUSH, async (_, config) => {
    try {
      const isRepo = await gitManager.isGitRepo(config.workingDirectory);
      if (!isRepo) return { success: false, error: 'No git repository found in working directory' };

      if (config.statusOnly) {
        const status = await gitManager.getStatus(config.workingDirectory);
        const branches = await gitManager.getBranches(config.workingDirectory);
        return { success: true, status, branches };
      }

      await gitManager.commitAndPush(config);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // Clipboard
  ipcMain.on(IPC.CLIPBOARD_LOG, (_, entry) => {
    clipboardStore.log(entry);
  });

  ipcMain.handle(IPC.CLIPBOARD_HISTORY, async (_, query?: string) => {
    return query ? clipboardStore.search(query) : clipboardStore.getAll();
  });

  // Queue management (from renderer)
  ipcMain.handle('queue:add', async (_, instanceId, item) => {
    queueManager.addToQueue(instanceId, item);
  });

  ipcMain.handle('queue:remove', async (_, instanceId, itemId) => {
    queueManager.removeFromQueue(instanceId, itemId);
  });

  ipcMain.handle('queue:reorder', async (_, instanceId, itemIds) => {
    queueManager.reorderQueue(instanceId, itemIds);
  });

  ipcMain.handle('queue:get', async (_, instanceId) => {
    return queueManager.getQueue(instanceId);
  });

  ipcMain.handle('pty:force-idle', async (_, id) => {
    ptyManager.forceIdle(id);
  });

  // Cleanup on app quit
  const { app } = require('electron');
  app.on('before-quit', () => {
    ptyManager.killAll();
  });
}
```

- [ ] **Step 2: Update index.ts to use the proper import**

Update `src/main/index.ts` to import and call `registerIpcHandlers` properly (already done in Task 1, verify it compiles).

- [ ] **Step 3: Verify full main process compiles**

Run: `npx tsc -p tsconfig.main.json --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc-handlers.ts
git commit -m "feat: wire all IPC handlers connecting PTY, queue, git, settings, clipboard"
```

---

## Task 9: Zustand Stores (Renderer)

**Files:**
- Create: `src/renderer/store/instances.ts`
- Create: `src/renderer/store/settings.ts`
- Create: `src/renderer/store/clipboard.ts`
- Create: `src/renderer/store/layout.ts`

- [ ] **Step 1: Create instances store**

```typescript
// src/renderer/store/instances.ts
import { create } from 'zustand';
import { Instance, QueueItem, PlanItem } from '@shared/types';

interface InstancesState {
  instances: Map<string, Instance>;
  activeInstanceId: string | null;

  addInstance: (instance: Instance) => void;
  removeInstance: (id: string) => void;
  setActive: (id: string) => void;
  updateStatus: (id: string, update: {
    status: Instance['status'];
    taskDescription: string;
    progressPercent: number | null;
    planItems: PlanItem[];
  }) => void;
  updateQueue: (id: string, queue: QueueItem[]) => void;
  toggleSound: (id: string) => void;
  renameInstance: (id: string, name: string) => void;
}

export const useInstancesStore = create<InstancesState>((set, get) => ({
  instances: new Map(),
  activeInstanceId: null,

  addInstance: (instance) => set(state => {
    const next = new Map(state.instances);
    next.set(instance.id, instance);
    return { instances: next, activeInstanceId: instance.id };
  }),

  removeInstance: (id) => set(state => {
    const next = new Map(state.instances);
    next.delete(id);
    const activeInstanceId = state.activeInstanceId === id
      ? (next.keys().next().value ?? null)
      : state.activeInstanceId;
    return { instances: next, activeInstanceId };
  }),

  setActive: (id) => set({ activeInstanceId: id }),

  updateStatus: (id, update) => set(state => {
    const next = new Map(state.instances);
    const inst = next.get(id);
    if (inst) next.set(id, { ...inst, ...update });
    return { instances: next };
  }),

  updateQueue: (id, queue) => set(state => {
    const next = new Map(state.instances);
    const inst = next.get(id);
    if (inst) next.set(id, { ...inst, queue });
    return { instances: next };
  }),

  toggleSound: (id) => set(state => {
    const next = new Map(state.instances);
    const inst = next.get(id);
    if (inst) next.set(id, { ...inst, soundEnabled: !inst.soundEnabled });
    return { instances: next };
  }),

  renameInstance: (id, name) => set(state => {
    const next = new Map(state.instances);
    const inst = next.get(id);
    if (inst) next.set(id, { ...inst, name });
    return { instances: next };
  }),
}));
```

- [ ] **Step 2: Create layout store**

```typescript
// src/renderer/store/layout.ts
import { create } from 'zustand';

export type SplitDirection = 'horizontal' | 'vertical';

export interface PaneNode {
  type: 'pane';
  instanceId: string;
}

export interface SplitNode {
  type: 'split';
  direction: SplitDirection;
  children: LayoutNode[];
  sizes: number[]; // percentages, e.g. [50, 50]
}

export type LayoutNode = PaneNode | SplitNode;

interface LayoutState {
  root: LayoutNode | null;
  setRoot: (root: LayoutNode | null) => void;
  addPane: (instanceId: string, direction?: SplitDirection) => void;
  removePane: (instanceId: string) => void;
  setSplitSizes: (path: number[], sizes: number[]) => void;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  root: null,

  setRoot: (root) => set({ root }),

  addPane: (instanceId, direction = 'horizontal') => set(state => {
    const newPane: PaneNode = { type: 'pane', instanceId };
    if (!state.root) return { root: newPane };

    // Add as a split with the current root
    return {
      root: {
        type: 'split',
        direction,
        children: [state.root, newPane],
        sizes: [50, 50],
      },
    };
  }),

  removePane: (instanceId) => set(state => {
    if (!state.root) return state;
    const result = removePaneFromTree(state.root, instanceId);
    return { root: result };
  }),

  setSplitSizes: (path, sizes) => set(state => {
    if (!state.root) return state;
    const newRoot = structuredClone(state.root);
    // path identifies the split node to update. Navigate parent-by-parent.
    // Empty path = root node itself.
    let node: any = newRoot;
    for (let i = 0; i < path.length; i++) {
      if (node.type === 'split') node = node.children[path[i]];
    }
    if (node.type === 'split') node.sizes = sizes;
    return { root: newRoot };
  }),
}));

function removePaneFromTree(node: LayoutNode, instanceId: string): LayoutNode | null {
  if (node.type === 'pane') {
    return node.instanceId === instanceId ? null : node;
  }

  const remaining = node.children
    .map(child => removePaneFromTree(child, instanceId))
    .filter(Boolean) as LayoutNode[];

  if (remaining.length === 0) return null;
  if (remaining.length === 1) return remaining[0];

  return { ...node, children: remaining, sizes: remaining.map(() => 100 / remaining.length) };
}
```

- [ ] **Step 3: Create settings and clipboard stores**

```typescript
// src/renderer/store/settings.ts
import { create } from 'zustand';
import { GlobalSettings, SkillsMcpConfig } from '@shared/types';
import { DEFAULTS } from '@shared/constants';

interface SettingsState {
  global: GlobalSettings;
  skillsMcp: SkillsMcpConfig;
  sidebarOpen: boolean;
  setGlobal: (settings: Partial<GlobalSettings>) => void;
  setSkillsMcp: (config: SkillsMcpConfig) => void;
  toggleSidebar: () => void;
  load: () => Promise<void>;
  save: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  global: DEFAULTS,
  skillsMcp: { globalSkills: {}, globalMcp: {}, perInstance: {} },
  sidebarOpen: false,

  setGlobal: (settings) => {
    set(state => ({ global: { ...state.global, ...settings } }));
    get().save();
  },

  setSkillsMcp: (config) => {
    set({ skillsMcp: config });
    get().save();
  },

  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

  load: async () => {
    const data = await (window as any).api.getSettings();
    set({ global: { ...DEFAULTS, ...data.global }, skillsMcp: data.skillsMcp });
  },

  save: async () => {
    const { global, skillsMcp } = get();
    await (window as any).api.setSettings({ global, skillsMcp });
  },
}));
```

```typescript
// src/renderer/store/clipboard.ts
import { create } from 'zustand';
import { PasteEntry } from '@shared/types';

interface ClipboardState {
  entries: PasteEntry[];
  panelOpen: boolean;
  searchQuery: string;
  togglePanel: () => void;
  setSearchQuery: (query: string) => void;
  load: () => Promise<void>;
  logPaste: (text: string, instanceId: string, instanceName: string) => void;
  filteredEntries: () => PasteEntry[];
}

export const useClipboardStore = create<ClipboardState>((set, get) => ({
  entries: [],
  panelOpen: false,
  searchQuery: '',

  togglePanel: () => set(state => ({ panelOpen: !state.panelOpen })),

  setSearchQuery: (query) => set({ searchQuery: query }),

  load: async () => {
    const entries = await (window as any).api.getClipboardHistory();
    set({ entries });
  },

  logPaste: (text, instanceId, instanceName) => {
    const entry = { timestamp: Date.now(), text, instanceId, instanceName };
    (window as any).api.logPaste(entry);
    set(state => ({
      entries: [{ ...entry, id: crypto.randomUUID() }, ...state.entries].slice(0, 1000),
    }));
  },

  filteredEntries: () => {
    const { entries, searchQuery } = get();
    if (!searchQuery) return entries;
    const lower = searchQuery.toLowerCase();
    return entries.filter(e => e.text.toLowerCase().includes(lower));
  },
}));
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/store/
git commit -m "feat: add Zustand stores for instances, layout, settings, clipboard"
```

---

## Task 10: Terminal View & PTY Hook

**Files:**
- Create: `src/renderer/hooks/useTerminal.ts`
- Create: `src/renderer/hooks/usePty.ts`
- Create: `src/renderer/components/TerminalView.tsx`

- [ ] **Step 1: Create useTerminal hook**

```typescript
// src/renderer/hooks/useTerminal.ts
import { useRef, useEffect } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { useSettingsStore } from '../store/settings';
import { useClipboardStore } from '../store/clipboard';

export function useTerminal(instanceId: string, instanceName: string) {
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollbackLines = useSettingsStore(s => s.global.scrollbackLines);
  const logPaste = useClipboardStore(s => s.logPaste);

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
      theme: {
        background: '#0a0a1a',
        foreground: '#e0e0e0',
        cursor: '#ffffff',
        selectionBackground: '#3a3a5c',
      },
      scrollback: scrollbackLines,
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());

    terminal.open(containerRef.current);
    fitAddon.fit();

    // Handle paste logging
    terminal.attachCustomKeyEventHandler((event) => {
      if (event.ctrlKey && event.key === 'v' && event.type === 'keydown') {
        navigator.clipboard.readText().then(text => {
          if (text) logPaste(text, instanceId, instanceName);
        });
      }
      return true;
    });

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
    };
  }, [instanceId]);

  return { terminalRef, fitAddonRef, containerRef };
}
```

- [ ] **Step 2: Create usePty hook**

```typescript
// src/renderer/hooks/usePty.ts
import { useEffect } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useInstancesStore } from '../store/instances';

const api = (window as any).api;

export function usePty(
  instanceId: string,
  terminal: Terminal | null,
  fitAddon: FitAddon | null,
) {
  const updateStatus = useInstancesStore(s => s.updateStatus);

  useEffect(() => {
    if (!terminal) return;

    // Receive PTY data → write to xterm
    const offData = api.onPtyData((id: string, data: string) => {
      if (id === instanceId) terminal.write(data);
    });

    // Receive status updates → update store
    const offStatus = api.onPtyStatus((id: string, status: any) => {
      if (id === instanceId) updateStatus(id, status);
    });

    // Receive errors
    const offError = api.onPtyError((id: string, error: any) => {
      if (id === instanceId) {
        terminal.writeln(`\r\n\x1b[31m[Error] ${error.message}\x1b[0m`);
        updateStatus(id, {
          status: error.type === 'crash' ? 'error' : 'stopped',
          taskDescription: error.message,
          progressPercent: null,
          planItems: [],
        });
      }
    });

    // Send user input → PTY
    const onData = terminal.onData((data: string) => {
      api.sendInput(instanceId, data);
    });

    // Send resize events
    const onResize = terminal.onResize(({ cols, rows }) => {
      api.resizePty(instanceId, cols, rows);
    });

    // Initial resize
    if (fitAddon) {
      fitAddon.fit();
      const dims = fitAddon.proposeDimensions();
      if (dims) api.resizePty(instanceId, dims.cols, dims.rows);
    }

    return () => {
      offData();
      offStatus();
      offError();
      onData.dispose();
      onResize.dispose();
    };
  }, [instanceId, terminal]);
}
```

- [ ] **Step 3: Create TerminalView component**

```tsx
// src/renderer/components/TerminalView.tsx
import { useTerminal } from '../hooks/useTerminal';
import { usePty } from '../hooks/usePty';
import '@xterm/xterm/css/xterm.css';

interface TerminalViewProps {
  instanceId: string;
  instanceName: string;
}

export function TerminalView({ instanceId, instanceName }: TerminalViewProps) {
  const { terminalRef, fitAddonRef, containerRef } = useTerminal(instanceId, instanceName);

  usePty(instanceId, terminalRef.current, fitAddonRef.current);

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0"
    />
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/hooks/ src/renderer/components/TerminalView.tsx
git commit -m "feat: add TerminalView with xterm.js, PTY IPC bridge, paste logging"
```

---

## Task 11: StatusBar Component

**Files:**
- Create: `src/renderer/components/StatusBar.tsx`

- [ ] **Step 1: Implement StatusBar**

```tsx
import { useState } from 'react';
import { useInstancesStore } from '../store/instances';

interface StatusBarProps {
  instanceId: string;
}

export function StatusBar({ instanceId }: StatusBarProps) {
  const instance = useInstancesStore(s => s.instances.get(instanceId));
  const toggleSound = useInstancesStore(s => s.toggleSound);
  const renameInstance = useInstancesStore(s => s.renameInstance);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');

  if (!instance) return null;

  const statusIcon = {
    idle: '✓',
    working: '⟳',
    'waiting-for-input': '⚠',
    error: '✕',
    stopped: '■',
  }[instance.status];

  const statusColor = {
    idle: 'text-green-400',
    working: 'text-blue-400',
    'waiting-for-input': 'text-yellow-400',
    error: 'text-red-400',
    stopped: 'text-gray-500',
  }[instance.status];

  const handleDoubleClick = () => {
    setNameInput(instance.name);
    setEditing(true);
  };

  const handleNameSubmit = () => {
    if (nameInput.trim()) renameInstance(instanceId, nameInput.trim());
    setEditing(false);
  };

  return (
    <div className="flex items-center h-8 px-3 bg-gray-900 border-b border-gray-800 text-sm gap-3">
      <span className={statusColor}>{statusIcon}</span>

      {editing ? (
        <input
          className="bg-gray-800 text-gray-100 px-1 rounded text-sm w-32"
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onBlur={handleNameSubmit}
          onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
          autoFocus
        />
      ) : (
        <span
          className="text-gray-300 cursor-pointer"
          onDoubleClick={handleDoubleClick}
        >
          {instance.name}
        </span>
      )}

      <span className="text-gray-500 truncate flex-1">
        {instance.taskDescription || (instance.status === 'working' ? 'Working...' : '')}
      </span>

      {instance.status === 'working' && (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            {instance.progressPercent !== null ? (
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${instance.progressPercent}%` }}
              />
            ) : (
              <div className="h-full bg-blue-500 rounded-full animate-pulse w-full opacity-30" />
            )}
          </div>
          {instance.progressPercent !== null && (
            <span className="text-xs text-gray-400">{instance.progressPercent}%</span>
          )}
        </div>
      )}

      {instance.status === 'waiting-for-input' && (
        <button
          onClick={() => (window as any).api.forceIdle(instanceId)}
          className="text-xs text-yellow-400 hover:text-yellow-300 px-2"
        >
          Mark idle
        </button>
      )}

      <button
        onClick={() => toggleSound(instanceId)}
        className={`text-sm ${instance.soundEnabled ? 'text-gray-300' : 'text-gray-600'}`}
        title={instance.soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
      >
        {instance.soundEnabled ? '🔔' : '🔕'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/StatusBar.tsx
git commit -m "feat: add StatusBar with progress, status icons, rename, sound toggle"
```

---

## Task 12: PlanChecklist & CommandQueue Components

**Files:**
- Create: `src/renderer/components/PlanChecklist.tsx`
- Create: `src/renderer/components/CommandQueue.tsx`

- [ ] **Step 1: Implement PlanChecklist**

```tsx
import { useState } from 'react';
import { useInstancesStore } from '../store/instances';

interface PlanChecklistProps {
  instanceId: string;
}

export function PlanChecklist({ instanceId }: PlanChecklistProps) {
  const planItems = useInstancesStore(s => s.instances.get(instanceId)?.planItems ?? []);
  const [collapsed, setCollapsed] = useState(false);

  if (planItems.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-gray-600 flex items-center gap-2">
        <span>📋</span> No plan detected
      </div>
    );
  }

  const completed = planItems.filter(p => p.completed).length;

  return (
    <div className="border-t border-gray-800">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center w-full px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800/50"
      >
        <span className="mr-2">{collapsed ? '▶' : '▼'}</span>
        Plan ({completed}/{planItems.length})
      </button>
      {!collapsed && (
        <div className="px-3 pb-2 max-h-40 overflow-y-auto">
          {planItems.map((item, i) => (
            <div key={i} className="flex items-start gap-2 py-0.5 text-xs">
              <span className={item.completed ? 'text-green-400' : 'text-gray-600'}>
                {item.completed ? '✅' : '⬜'}
              </span>
              <span className={item.completed ? 'text-gray-500 line-through' : 'text-gray-300'}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement CommandQueue**

```tsx
import { useState } from 'react';
import { useInstancesStore } from '../store/instances';
import { QueueItem } from '@shared/types';

interface CommandQueueProps {
  instanceId: string;
}

const api = (window as any).api;

export function CommandQueue({ instanceId }: CommandQueueProps) {
  const queue = useInstancesStore(s => s.instances.get(instanceId)?.queue ?? []);
  const updateQueue = useInstancesStore(s => s.updateQueue);
  const [newCommand, setNewCommand] = useState('');

  const addCommand = () => {
    if (!newCommand.trim()) return;
    const item: QueueItem = {
      id: crypto.randomUUID(),
      type: 'command',
      command: newCommand.trim(),
    };
    const updated = [...queue, item];
    updateQueue(instanceId, updated);
    api.queueAdd(instanceId, item);
    setNewCommand('');
  };

  const addGitPush = () => {
    const item: QueueItem = { id: crypto.randomUUID(), type: 'git-push' };
    const updated = [...queue, item];
    updateQueue(instanceId, updated);
    api.queueAdd(instanceId, item);
  };

  const removeItem = (itemId: string) => {
    updateQueue(instanceId, queue.filter(q => q.id !== itemId));
    api.queueRemove(instanceId, itemId);
  };

  if (queue.length === 0 && !newCommand) {
    return null; // Don't show empty queue
  }

  return (
    <div className="border-t border-gray-800 px-3 py-2">
      <div className="text-xs text-gray-400 mb-1">Queue ({queue.length})</div>
      <div className="max-h-32 overflow-y-auto">
        {queue.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2 py-0.5 text-xs group">
            <span className="text-gray-600 w-4">{i + 1}.</span>
            <span className="flex-1 text-gray-300 truncate">
              {item.type === 'git-push' ? '📤 Push to GitHub' : item.command}
            </span>
            <button
              onClick={() => removeItem(item.id)}
              className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        <input
          className="flex-1 bg-gray-800 text-gray-200 text-xs px-2 py-1 rounded"
          placeholder="Add command to queue..."
          value={newCommand}
          onChange={e => setNewCommand(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCommand()}
        />
        <button
          onClick={addGitPush}
          className="text-xs text-gray-400 hover:text-gray-200 px-2"
          title="Queue git push"
        >
          📤
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/PlanChecklist.tsx src/renderer/components/CommandQueue.tsx
git commit -m "feat: add PlanChecklist and CommandQueue components"
```

---

## Task 13: InputBar Component

**Files:**
- Create: `src/renderer/components/InputBar.tsx`

- [ ] **Step 1: Implement InputBar**

```tsx
import { useState } from 'react';
import { useInstancesStore } from '../store/instances';
import { QueueItem } from '@shared/types';

interface InputBarProps {
  instanceId: string;
  onSend: (text: string) => void;
  isStarted: boolean;
  onStart: (skipPermissions: boolean) => void;
}

export function InputBar({ instanceId, onSend, isStarted, onStart }: InputBarProps) {
  const [input, setInput] = useState('');
  const queue = useInstancesStore(s => s.instances.get(instanceId)?.queue ?? []);
  const updateQueue = useInstancesStore(s => s.updateQueue);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };

  const handleQueue = () => {
    if (!input.trim()) return;
    const item: QueueItem = {
      id: crypto.randomUUID(),
      type: 'command',
      command: input.trim(),
    };
    updateQueue(instanceId, [...queue, item]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleQueue();
    } else if (e.key === 'Enter' && !e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isStarted) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-t border-gray-800">
        <button
          onClick={() => onStart(false)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded"
        >
          Start Claude
        </button>
        <button
          onClick={() => onStart(true)}
          className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded flex items-center gap-1"
        >
          ▶ Skip Permissions
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-t border-gray-800">
      <input
        className="flex-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
        placeholder="Type a command... (Enter to send, Ctrl+Enter to queue)"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button
        onClick={handleSend}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded"
      >
        Send
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/InputBar.tsx
git commit -m "feat: add InputBar with send, queue, and start buttons"
```

---

## Task 14: TerminalPane — Compose All Subcomponents

**Files:**
- Create: `src/renderer/components/TerminalPane.tsx`

- [ ] **Step 1: Implement TerminalPane**

```tsx
import { useState } from 'react';
import { StatusBar } from './StatusBar';
import { TerminalView } from './TerminalView';
import { PlanChecklist } from './PlanChecklist';
import { CommandQueue } from './CommandQueue';
import { InputBar } from './InputBar';
import { useInstancesStore } from '../store/instances';

interface TerminalPaneProps {
  instanceId: string;
}

const api = (window as any).api;

export function TerminalPane({ instanceId }: TerminalPaneProps) {
  const instance = useInstancesStore(s => s.instances.get(instanceId));
  const [started, setStarted] = useState(false);

  if (!instance) return null;

  const handleStart = async (skipPermissions: boolean) => {
    await api.createPty({
      id: instanceId,
      workingDirectory: instance.workingDirectory,
      skipPermissions,
    });
    setStarted(true);
  };

  const handleSend = (text: string) => {
    api.sendInput(instanceId, text + '\n');
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 border border-gray-800 rounded">
      <StatusBar instanceId={instanceId} />
      <TerminalView instanceId={instanceId} instanceName={instance.name} />
      <PlanChecklist instanceId={instanceId} />
      <CommandQueue instanceId={instanceId} />
      <InputBar
        instanceId={instanceId}
        onSend={handleSend}
        isStarted={started}
        onStart={handleStart}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/TerminalPane.tsx
git commit -m "feat: add TerminalPane composing status, terminal, plan, queue, input"
```

---

## Task 15: TabBar & NewInstanceDialog

**Files:**
- Create: `src/renderer/components/TabBar.tsx`
- Create: `src/renderer/components/NewInstanceDialog.tsx`

- [ ] **Step 1: Implement NewInstanceDialog**

```tsx
import { useState } from 'react';
import { useSettingsStore } from '../store/settings';
import { MAX_INSTANCES, WARN_INSTANCES } from '@shared/constants';

interface NewInstanceDialogProps {
  instanceCount: number;
  onClose: () => void;
  onCreate: (name: string, workingDirectory: string, skipPermissions: boolean) => void;
}

export function NewInstanceDialog({ instanceCount, onClose, onCreate }: NewInstanceDialogProps) {
  const defaultDir = useSettingsStore(s => s.global.defaultWorkingDirectory);
  const defaultSkip = useSettingsStore(s => s.global.defaultSkipPermissions);
  const [name, setName] = useState(`Claude-${instanceCount + 1}`);
  const [dir, setDir] = useState(defaultDir);
  const [skip, setSkip] = useState(defaultSkip);

  if (instanceCount >= MAX_INSTANCES) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-96" onClick={e => e.stopPropagation()}>
          <h3 className="text-red-400 font-medium mb-2">Maximum instances reached</h3>
          <p className="text-sm text-gray-400">You can run up to {MAX_INSTANCES} Claude instances.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-700 text-gray-200 rounded text-sm">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-96" onClick={e => e.stopPropagation()}>
        <h3 className="text-gray-100 font-medium mb-4">New Claude Instance</h3>

        {instanceCount >= WARN_INSTANCES && (
          <div className="mb-3 p-2 bg-yellow-900/30 border border-yellow-700/50 rounded text-xs text-yellow-400">
            Running many Claude instances uses significant memory.
          </div>
        )}

        <label className="block mb-3">
          <span className="text-xs text-gray-400">Name</span>
          <input
            className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-2 rounded border border-gray-700"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </label>

        <label className="block mb-3">
          <span className="text-xs text-gray-400">Working Directory</span>
          <input
            className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-2 rounded border border-gray-700"
            value={dir}
            onChange={e => setDir(e.target.value)}
            placeholder="Leave empty for home directory"
          />
        </label>

        <label className="flex items-center gap-2 mb-4">
          <input type="checkbox" checked={skip} onChange={e => setSkip(e.target.checked)} />
          <span className="text-sm text-gray-300">Skip permissions</span>
        </label>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
          <button
            onClick={() => onCreate(name, dir, skip)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement TabBar**

```tsx
import { useInstancesStore } from '../store/instances';
import { useSettingsStore } from '../store/settings';

interface TabBarProps {
  onNewInstance: () => void;
}

export function TabBar({ onNewInstance }: TabBarProps) {
  const instances = useInstancesStore(s => s.instances);
  const activeId = useInstancesStore(s => s.activeInstanceId);
  const setActive = useInstancesStore(s => s.setActive);
  const removeInstance = useInstancesStore(s => s.removeInstance);
  const toggleSidebar = useSettingsStore(s => s.toggleSidebar);

  const statusIcon = (status: string) => ({
    idle: '✓',
    working: '⟳',
    'waiting-for-input': '⚠',
    error: '✕',
    stopped: '■',
  }[status] || '?');

  const statusColor = (status: string) => ({
    idle: 'text-green-400',
    working: 'text-blue-400 animate-spin',
    'waiting-for-input': 'text-yellow-400',
    error: 'text-red-400',
    stopped: 'text-gray-500',
  }[status] || 'text-gray-500');

  return (
    <div className="flex items-center h-10 bg-gray-900 border-b border-gray-800 px-1 gap-0.5 select-none">
      {Array.from(instances.values()).map(inst => (
        <div
          key={inst.id}
          onClick={() => setActive(inst.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-t cursor-pointer group ${
            activeId === inst.id
              ? 'bg-gray-950 text-gray-100 border-t border-x border-gray-700'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
        >
          <span className={`text-xs ${statusColor(inst.status)}`}>{statusIcon(inst.status)}</span>
          <span className="truncate max-w-[120px]">{inst.name}</span>
          <button
            onClick={e => { e.stopPropagation(); removeInstance(inst.id); }}
            className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 ml-1"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        onClick={onNewInstance}
        className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded"
        title="New instance"
      >
        +
      </button>

      <div className="flex-1" />

      <button
        onClick={toggleSidebar}
        className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded"
        title="Settings"
      >
        ⚙
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/TabBar.tsx src/renderer/components/NewInstanceDialog.tsx
git commit -m "feat: add TabBar with status icons and NewInstanceDialog"
```

---

## Task 16: SplitPaneContainer

**Files:**
- Create: `src/renderer/components/SplitPaneContainer.tsx`

- [ ] **Step 1: Implement SplitPaneContainer**

```tsx
import { useRef, useCallback, useState } from 'react';
import { LayoutNode, useLayoutStore } from '../store/layout';
import { TerminalPane } from './TerminalPane';

interface SplitPaneContainerProps {
  node: LayoutNode;
  path?: number[];
}

export function SplitPaneContainer({ node, path = [] }: SplitPaneContainerProps) {
  if (node.type === 'pane') {
    return <TerminalPane instanceId={node.instanceId} />;
  }

  const { direction, children, sizes } = node;
  const containerRef = useRef<HTMLDivElement>(null);
  const setSplitSizes = useLayoutStore(s => s.setSplitSizes);
  const [dragging, setDragging] = useState<number | null>(null);

  const handleMouseDown = useCallback((index: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(index);

    const startPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const container = containerRef.current;
    if (!container) return;

    const totalSize = direction === 'horizontal' ? container.offsetWidth : container.offsetHeight;

    const startSizes = [...sizes];

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = ((currentPos - startPos) / totalSize) * 100;

      const newSizes = [...startSizes];
      newSizes[index] = Math.max(10, startSizes[index] + delta);
      newSizes[index + 1] = Math.max(10, startSizes[index + 1] - delta);

      // path identifies THIS split node (empty = root)
      setSplitSizes(path, newSizes);
    };

    const handleMouseUp = () => {
      setDragging(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [direction, sizes, path, setSplitSizes]);

  return (
    <div
      ref={containerRef}
      className={`flex ${direction === 'horizontal' ? 'flex-row' : 'flex-col'} h-full w-full`}
    >
      {children.map((child, i) => (
        <div key={i} className="flex" style={{ flex: `0 0 ${sizes[i]}%` }}>
          {i > 0 && (
            <div
              className={`${direction === 'horizontal' ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize'} bg-gray-800 hover:bg-blue-500 transition-colors flex-shrink-0`}
              onMouseDown={handleMouseDown(i - 1)}
            />
          )}
          <div className="flex-1 min-w-0 min-h-0">
            <SplitPaneContainer node={child} path={[...path, i]} />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/SplitPaneContainer.tsx
git commit -m "feat: add SplitPaneContainer with recursive layout and drag-to-resize"
```

---

## Task 17: Settings Sidebar, SkillsMcpPanel, WorkflowPresets

**Files:**
- Create: `src/renderer/components/SettingsSidebar.tsx`
- Create: `src/renderer/components/SkillsMcpPanel.tsx`
- Create: `src/renderer/components/WorkflowPresets.tsx`

- [ ] **Step 1: Implement SkillsMcpPanel**

```tsx
import { useSettingsStore } from '../store/settings';

export function SkillsMcpPanel() {
  const skillsMcp = useSettingsStore(s => s.skillsMcp);
  const setSkillsMcp = useSettingsStore(s => s.setSkillsMcp);

  const toggleSkill = (name: string) => {
    setSkillsMcp({
      ...skillsMcp,
      globalSkills: {
        ...skillsMcp.globalSkills,
        [name]: !skillsMcp.globalSkills[name],
      },
    });
  };

  const toggleMcp = (name: string) => {
    setSkillsMcp({
      ...skillsMcp,
      globalMcp: {
        ...skillsMcp.globalMcp,
        [name]: !skillsMcp.globalMcp[name],
      },
    });
  };

  const toggleAll = (type: 'skills' | 'mcp', value: boolean) => {
    const source = type === 'skills' ? skillsMcp.globalSkills : skillsMcp.globalMcp;
    const updated = Object.fromEntries(Object.keys(source).map(k => [k, value]));
    setSkillsMcp({
      ...skillsMcp,
      [type === 'skills' ? 'globalSkills' : 'globalMcp']: updated,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium text-gray-400 uppercase">Skills</h4>
          <button
            onClick={() => toggleAll('skills', true)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Enable all
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(skillsMcp.globalSkills).map(([name, enabled]) => (
            <label key={name} className="flex items-center gap-2 text-xs text-gray-300 py-1 px-2 hover:bg-gray-800 rounded">
              <input type="checkbox" checked={enabled} onChange={() => toggleSkill(name)} />
              {name}
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium text-gray-400 uppercase">MCP Servers</h4>
          <button
            onClick={() => toggleAll('mcp', true)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Enable all
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(skillsMcp.globalMcp).map(([name, enabled]) => (
            <label key={name} className="flex items-center gap-2 text-xs text-gray-300 py-1 px-2 hover:bg-gray-800 rounded">
              <input type="checkbox" checked={enabled} onChange={() => toggleMcp(name)} />
              {name}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement WorkflowPresets**

```tsx
export function WorkflowPresets() {
  const presets = [
    { name: 'Debugging', icon: '🐛', description: 'Systematic debugging with verbose logging' },
    { name: 'Security Audit', icon: '🔒', description: 'Security scanning and OWASP checks' },
    { name: 'E2E Testing', icon: '🧪', description: 'End-to-end test runner' },
  ];

  return (
    <div>
      <h4 className="text-xs font-medium text-gray-400 uppercase mb-2">Workflow Presets</h4>
      <div className="space-y-1">
        {presets.map(preset => (
          <button
            key={preset.name}
            className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-800 rounded text-sm"
          >
            <span>{preset.icon}</span>
            <div>
              <div className="text-gray-200">{preset.name}</div>
              <div className="text-xs text-gray-500">{preset.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement SettingsSidebar**

```tsx
import { useSettingsStore } from '../store/settings';
import { SkillsMcpPanel } from './SkillsMcpPanel';
import { WorkflowPresets } from './WorkflowPresets';

export function SettingsSidebar() {
  const { sidebarOpen, global: settings, setGlobal, toggleSidebar } = useSettingsStore();

  if (!sidebarOpen) return null;

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-gray-200">Settings</h3>
        <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-200">✕</button>
      </div>

      <div className="p-4 space-y-6">
        {/* Global Settings */}
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-400 uppercase">General</h4>

          <label className="block">
            <span className="text-xs text-gray-400">Default Working Directory</span>
            <input
              className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700"
              value={settings.defaultWorkingDirectory}
              onChange={e => setGlobal({ defaultWorkingDirectory: e.target.value })}
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={e => setGlobal({ soundEnabled: e.target.checked })}
            />
            <span className="text-sm text-gray-300">Sound notifications</span>
          </label>

          {settings.soundEnabled && (
            <>
              <label className="block">
                <span className="text-xs text-gray-400">Sound</span>
                <select
                  className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700"
                  value={settings.soundChoice}
                  onChange={e => setGlobal({ soundChoice: e.target.value as any })}
                >
                  <option value="chime">Chime</option>
                  <option value="bell">Bell</option>
                  <option value="ding">Ding</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-gray-400">Volume ({Math.round(settings.soundVolume * 100)}%)</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.soundVolume}
                  onChange={e => setGlobal({ soundVolume: parseFloat(e.target.value) })}
                  className="w-full mt-1"
                />
              </label>
            </>
          )}

          <label className="block">
            <span className="text-xs text-gray-400">Theme</span>
            <select
              className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700"
              value={settings.theme}
              onChange={e => setGlobal({ theme: e.target.value as any })}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.defaultSkipPermissions}
              onChange={e => setGlobal({ defaultSkipPermissions: e.target.checked })}
            />
            <span className="text-sm text-gray-300">Skip permissions by default</span>
          </label>

          <label className="block">
            <span className="text-xs text-gray-400">GitHub Default Branch</span>
            <input
              className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700"
              value={settings.githubDefaultBranch}
              onChange={e => setGlobal({ githubDefaultBranch: e.target.value })}
            />
          </label>
        </div>

        <SkillsMcpPanel />
        <WorkflowPresets />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/SettingsSidebar.tsx src/renderer/components/SkillsMcpPanel.tsx src/renderer/components/WorkflowPresets.tsx
git commit -m "feat: add SettingsSidebar with skills/MCP toggles and workflow presets"
```

---

## Task 18: ClipboardHistory & GitPushDialog

**Files:**
- Create: `src/renderer/components/ClipboardHistory.tsx`
- Create: `src/renderer/components/GitPushDialog.tsx`

- [ ] **Step 1: Implement ClipboardHistory**

```tsx
import { useClipboardStore } from '../store/clipboard';

interface ClipboardHistoryProps {
  onPaste: (text: string) => void;
}

export function ClipboardHistory({ onPaste }: ClipboardHistoryProps) {
  const { panelOpen, togglePanel, searchQuery, setSearchQuery, filteredEntries } = useClipboardStore();

  if (!panelOpen) return null;

  const entries = filteredEntries();

  return (
    <div className="fixed right-0 top-10 bottom-0 w-80 bg-gray-900 border-l border-gray-800 z-40 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-gray-200">Paste History</h3>
        <button onClick={togglePanel} className="text-gray-500 hover:text-gray-200">✕</button>
      </div>

      <div className="px-4 py-2">
        <input
          className="w-full bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700"
          placeholder="Search..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {entries.map(entry => (
          <button
            key={entry.id}
            onClick={() => onPaste(entry.text)}
            className="w-full text-left px-4 py-2 hover:bg-gray-800 border-b border-gray-800/50"
          >
            <div className="text-xs text-gray-500">
              {new Date(entry.timestamp).toLocaleTimeString()} — {entry.instanceName}
            </div>
            <div className="text-sm text-gray-300 truncate mt-0.5">
              {entry.text.slice(0, 100)}
            </div>
          </button>
        ))}
        {entries.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-600">
            No paste history yet
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement GitPushDialog**

```tsx
import { useState, useEffect } from 'react';

interface GitPushDialogProps {
  workingDirectory: string;
  onClose: () => void;
}

const api = (window as any).api;

export function GitPushDialog({ workingDirectory, onClose }: GitPushDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [branch, setBranch] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<any>(null);
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    (async () => {
      const result = await api.gitPush({ workingDirectory, statusOnly: true });
      setLoading(false);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStatus(result.status);
      setBranches(result.branches);
      setBranch(result.status.branch);
      setMessage(`Update from Multiterminal`);
    })();
  }, [workingDirectory]);

  const handlePush = async () => {
    setPushing(true);
    const result = await api.gitPush({ workingDirectory, branch, message });
    setPushing(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-[480px]" onClick={e => e.stopPropagation()}>
        <h3 className="text-gray-100 font-medium mb-4">Push to GitHub</h3>

        {loading && <div className="text-gray-400 text-sm">Loading git status...</div>}

        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700/50 rounded text-sm text-red-400 mb-4">
            {error}
          </div>
        )}

        {status && !error && (
          <>
            <div className="mb-3 text-xs text-gray-400">
              {status.staged.length} staged, {status.unstaged.length} unstaged, {status.untracked.length} untracked
            </div>

            <label className="block mb-3">
              <span className="text-xs text-gray-400">Branch</span>
              <select
                className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-2 rounded border border-gray-700"
                value={branch}
                onChange={e => setBranch(e.target.value)}
              >
                {branches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>

            <label className="block mb-4">
              <span className="text-xs text-gray-400">Commit Message</span>
              <input
                className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-2 rounded border border-gray-700"
                value={message}
                onChange={e => setMessage(e.target.value)}
              />
            </label>
          </>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
          <button
            onClick={handlePush}
            disabled={pushing || !!error || loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-sm rounded"
          >
            {pushing ? 'Pushing...' : 'Commit & Push'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/ClipboardHistory.tsx src/renderer/components/GitPushDialog.tsx
git commit -m "feat: add ClipboardHistory panel and GitPushDialog modal"
```

---

## Task 19: AppShell — Wire Everything Together

**Files:**
- Modify: `src/renderer/components/AppShell.tsx`
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Implement full AppShell**

```tsx
import { useState, useEffect } from 'react';
import { TabBar } from './TabBar';
import { SplitPaneContainer } from './SplitPaneContainer';
import { TerminalPane } from './TerminalPane';
import { SettingsSidebar } from './SettingsSidebar';
import { ClipboardHistory } from './ClipboardHistory';
import { GitPushDialog } from './GitPushDialog';
import { NewInstanceDialog } from './NewInstanceDialog';
import { useInstancesStore } from '../store/instances';
import { useLayoutStore } from '../store/layout';
import { useSettingsStore } from '../store/settings';
import { useClipboardStore } from '../store/clipboard';
import { Instance } from '@shared/types';

export function AppShell() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showGitDialog, setShowGitDialog] = useState(false);
  const instances = useInstancesStore(s => s.instances);
  const activeId = useInstancesStore(s => s.activeInstanceId);
  const addInstance = useInstancesStore(s => s.addInstance);
  const root = useLayoutStore(s => s.root);
  const addPane = useLayoutStore(s => s.addPane);
  const sidebarOpen = useSettingsStore(s => s.sidebarOpen);
  const loadSettings = useSettingsStore(s => s.load);
  const loadClipboard = useClipboardStore(s => s.load);
  const toggleClipboard = useClipboardStore(s => s.togglePanel);

  useEffect(() => {
    loadSettings();
    loadClipboard();

    // Keyboard shortcut for clipboard history
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        toggleClipboard();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleCreateInstance = (name: string, workingDirectory: string, skipPermissions: boolean) => {
    const id = crypto.randomUUID();
    const instance: Instance = {
      id,
      name,
      workingDirectory,
      skipPermissions,
      status: 'stopped',
      taskDescription: '',
      progressPercent: null,
      planItems: [],
      queue: [],
      soundEnabled: true,
    };
    addInstance(instance);
    addPane(id);
    setShowNewDialog(false);
  };

  const activeInstance = activeId ? instances.get(activeId) : null;

  const handlePaste = (text: string) => {
    if (activeId) {
      (window as any).api.sendInput(activeId, text);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Top bar */}
      <div className="flex items-center">
        <div className="flex-1">
          <TabBar onNewInstance={() => setShowNewDialog(true)} />
        </div>
        <div className="flex items-center gap-1 px-2 bg-gray-900 border-b border-gray-800 h-10">
          <button
            onClick={toggleClipboard}
            className="w-8 h-8 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded flex items-center justify-center text-sm"
            title="Paste History (Ctrl+Shift+V)"
          >
            📋
          </button>
          <button
            onClick={() => activeInstance && setShowGitDialog(true)}
            className="w-8 h-8 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded flex items-center justify-center text-sm"
            title="Push to GitHub"
          >
            📤
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          {root ? (
            <SplitPaneContainer node={root} />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-600">
              <div className="text-center">
                <div className="text-4xl mb-4">⚡</div>
                <div className="text-lg mb-2">Welcome to Multiterminal</div>
                <button
                  onClick={() => setShowNewDialog(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded"
                >
                  + New Claude Instance
                </button>
              </div>
            </div>
          )}
        </div>

        {sidebarOpen && <SettingsSidebar />}
      </div>

      {/* Overlays */}
      <ClipboardHistory onPaste={handlePaste} />

      {showNewDialog && (
        <NewInstanceDialog
          instanceCount={instances.size}
          onClose={() => setShowNewDialog(false)}
          onCreate={handleCreateInstance}
        />
      )}

      {showGitDialog && activeInstance && (
        <GitPushDialog
          workingDirectory={activeInstance.workingDirectory}
          onClose={() => setShowGitDialog(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/AppShell.tsx src/renderer/App.tsx
git commit -m "feat: wire AppShell with tabs, panes, settings, clipboard, git push"
```

---

## Task 20: Sound Assets & Audio Playback

**Files:**
- Modify: `src/renderer/App.tsx` (add sound effect hook)

- [ ] **Step 1: Generate sound files**

Use a simple script to create basic notification sounds, or download CC0 sound effects. Place 3 short audio files in `assets/sounds/`:
- `chime.mp3` — gentle two-tone chime
- `bell.mp3` — single bell ring
- `ding.mp3` — quick ding

For development, create simple tones using Web Audio API or use placeholder files.

- [ ] **Step 2: Add sound playback in renderer**

Add a `useSoundNotification` hook in `src/renderer/hooks/useSound.ts`:

```typescript
import { useEffect, useRef } from 'react';

const api = (window as any).api;

export function useSoundNotification() {
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const off = api.onNotificationDone((_id: string, config: { sound: string; volume: number }) => {
      playSound(config.sound, config.volume);
    });
    return off;
  }, []);

  async function playSound(sound: string, volume: number) {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;

    // Simple synthesized tone as fallback
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    const freq = { chime: 880, bell: 660, ding: 1200 }[sound] ?? 880;
    oscillator.frequency.value = freq;
    oscillator.type = 'sine';
    gainNode.gain.value = volume * 0.3;

    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    oscillator.stop(ctx.currentTime + 0.5);
  }
}
```

- [ ] **Step 3: Use the hook in App.tsx**

```tsx
import { AppShell } from './components/AppShell';
import { useSoundNotification } from './hooks/useSound';

export default function App() {
  useSoundNotification();
  return <AppShell />;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/hooks/useSound.ts src/renderer/App.tsx
git commit -m "feat: add sound notification playback with synthesized tones"
```

---

## Task 21: Electron Build Configuration

**Files:**
- Create: `electron-builder.yml`
- Modify: `package.json`

- [ ] **Step 1: Create electron-builder config**

```yaml
appId: com.multiterminal.app
productName: Multiterminal
directories:
  output: release
  buildResources: assets
files:
  - dist/**/*
  - assets/**/*
win:
  target: nsis
  icon: assets/icon.ico
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
```

- [ ] **Step 2: Add package script**

In `package.json`, ensure the `package` script exists:
```json
"package": "npm run build && electron-builder"
```

- [ ] **Step 3: Commit**

```bash
git add electron-builder.yml package.json
git commit -m "feat: add electron-builder config for Windows packaging"
```

---

## Task 22: Integration — Full Dev Test

- [ ] **Step 1: Run the full dev build**

```bash
npm run build:main && npm run dev:renderer
```

Fix any TypeScript compilation errors.

- [ ] **Step 2: Start Electron in dev mode**

```bash
npm run start
```

Verify:
- Window opens with welcome screen
- [+] button opens new instance dialog
- Creating an instance spawns a tab and terminal pane
- Terminal connects to Claude Code PTY
- Status bar updates
- Settings sidebar opens/closes
- Copy/paste works in terminal

- [ ] **Step 3: Fix any integration issues found**

Address compilation errors, missing imports, IPC wiring issues.

- [ ] **Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve integration issues from full dev test"
```

---

## Task 23: Final Polish & .gitignore

- [ ] **Step 1: Create .gitignore**

```
node_modules/
dist/
release/
.superpowers/
*.log
```

- [ ] **Step 2: Add type declaration for window.api**

Create `src/renderer/env.d.ts`:
```typescript
declare interface Window {
  api: {
    createPty: (config: { id: string; workingDirectory: string; skipPermissions: boolean }) => Promise<any>;
    sendInput: (id: string, data: string) => void;
    resizePty: (id: string, cols: number, rows: number) => void;
    killPty: (id: string) => Promise<void>;
    restartPty: (id: string) => Promise<void>;
    onPtyData: (callback: (id: string, data: string) => void) => () => void;
    onPtyStatus: (callback: (id: string, status: any) => void) => () => void;
    onPtyError: (callback: (id: string, error: any) => void) => () => void;
    onQueueSendNext: (callback: (id: string) => void) => () => void;
    onNotificationDone: (callback: (id: string, config: any) => void) => () => void;
    getSettings: () => Promise<any>;
    setSettings: (settings: any) => Promise<void>;
    gitPush: (config: any) => Promise<any>;
    logPaste: (entry: any) => void;
    getClipboardHistory: (query?: string) => Promise<any[]>;
    queueAdd: (instanceId: string, item: any) => Promise<void>;
    queueRemove: (instanceId: string, itemId: string) => Promise<void>;
    queueReorder: (instanceId: string, itemIds: string[]) => Promise<void>;
    queueGet: (instanceId: string) => Promise<any[]>;
    forceIdle: (id: string) => Promise<void>;
  };
}
```

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: add .gitignore, type declarations, final polish"
```
