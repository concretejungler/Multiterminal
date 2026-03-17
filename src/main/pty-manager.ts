import * as pty from 'node-pty';
import { BrowserWindow } from 'electron';
import stripAnsi from 'strip-ansi';
import fs from 'fs';
import path from 'path';
import { IPC, PROMPT_PATTERNS, PERMISSION_PATTERNS, STATUS_PATTERNS, IDLE_DEBOUNCE_MS, IDLE_SILENCE_MS } from '../shared/constants';
import { PlanItem } from '../shared/types';

const logFile = path.join(process.env.USERPROFILE || process.env.HOME || '.', 'Desktop', 'multiterminal-debug.log');
function debugLog(level: string, ...args: any[]) {
  const msg = `[${new Date().toISOString()}] [PTY] [${level}] ${args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')}\n`;
  try { fs.appendFileSync(logFile, msg); } catch {}
}

interface PtyInstance {
  pty: pty.IPty;
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
    // On Windows, spawn through the system shell so PATH resolution works
    // and the user gets a real terminal experience
    const isWindows = process.platform === 'win32';
    const shell = isWindows
      ? process.env.COMSPEC || 'cmd.exe'
      : process.env.SHELL || '/bin/bash';
    const cwd = workingDirectory || process.env.USERPROFILE || process.env.HOME || '.';

    // Prevent duplicate spawn for same ID
    if (this.instances.has(id)) {
      debugLog('WARN', `PTY already exists for id: ${id}, skipping spawn`);
      return;
    }

    debugLog('INFO', `Spawning shell: ${shell}, cwd: ${cwd}, skipPermissions: ${skipPermissions}`);

    let ptyProcess: pty.IPty;
    try {
      ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 120,
        rows: 30,
        cwd,
        env: process.env as Record<string, string>,
      });
      debugLog('INFO', `PTY spawned successfully, pid: ${ptyProcess.pid}`);
    } catch (err: any) {
      debugLog('ERROR', `PTY spawn failed: ${err.message}`, err.stack);
      this.safeSend(IPC.PTY_ERROR, id, {
        type: 'spawn-failed',
        message: err.message,
      });
      return;
    }

    // Auto-send the claude command after shell starts
    const claudeCmd = skipPermissions
      ? 'claude --dangerously-skip-permissions'
      : 'claude';
    debugLog('INFO', `Will auto-send: ${claudeCmd}`);
    setTimeout(() => {
      ptyProcess.write(claudeCmd + '\r');
    }, 500);

    const instance: PtyInstance = {
      pty: ptyProcess,
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

    ptyProcess.onData((data: string) => {
      instance.lastOutputTime = Date.now();
      instance.outputBuffer += data;
      if (instance.outputBuffer.length > 10000) {
        instance.outputBuffer = instance.outputBuffer.slice(-5000);
      }
      this.safeSend(IPC.PTY_DATA, id, data);
      this.parseStatus(instance);
    });

    ptyProcess.onExit(({ exitCode }) => {
      debugLog('INFO', `PTY exited, id: ${id}, exitCode: ${exitCode}`);
      instance.status = 'stopped';
      this.clearTimers(instance);
      if (exitCode !== 0) {
        this.safeSend(IPC.PTY_ERROR, id, {
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

    for (const pattern of STATUS_PATTERNS) {
      const match = stripped.slice(-500).match(pattern);
      if (match) {
        instance.taskDescription = match[1].trim().slice(0, 100);
        instance.status = 'working';
        break;
      }
    }

    const planItems: PlanItem[] = [];
    const checkboxRegex = /^[\s]*-\s*\[([ xX✓✗])\]\s*(.+)$/gm;
    let planMatch;
    while ((planMatch = checkboxRegex.exec(stripped)) !== null) {
      planItems.push({ text: planMatch[2].trim(), completed: planMatch[1] !== ' ' });
    }
    if (planItems.length > 0) {
      instance.planItems = planItems;
      const completed = planItems.filter(p => p.completed).length;
      instance.progressPercent = Math.round((completed / planItems.length) * 100);
    }

    const lastChunk = stripped.slice(-100);
    const promptDetected = PROMPT_PATTERNS.some(p => p.test(lastChunk));
    if (promptDetected) {
      this.startIdleDebounce(instance);
    } else {
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

  private safeSend(channel: string, ...args: any[]): void {
    try {
      if (this.window && !this.window.isDestroyed() && this.window.webContents && !this.window.webContents.isDestroyed()) {
        this.window.webContents.send(channel, ...args);
      }
    } catch {}
  }

  private sendStatusUpdate(instance: PtyInstance): void {
    this.safeSend(IPC.PTY_STATUS, instance.id, {
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
