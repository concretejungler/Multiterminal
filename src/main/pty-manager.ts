import * as pty from 'node-pty';
import { BrowserWindow } from 'electron';
import stripAnsi from 'strip-ansi';
import { IPC, PROMPT_PATTERNS, PERMISSION_PATTERNS, STATUS_PATTERNS, IDLE_DEBOUNCE_MS, IDLE_SILENCE_MS } from '../shared/constants';
import { PlanItem } from '../shared/types';

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
    const args = skipPermissions ? ['--dangerously-skip-permissions'] : [];

    let ptyProcess: pty.IPty;
    try {
      ptyProcess = pty.spawn('claude', args, {
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
      this.window.webContents.send(IPC.PTY_DATA, id, data);
      this.parseStatus(instance);
    });

    ptyProcess.onExit(({ exitCode }) => {
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
