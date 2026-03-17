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

    const saved = settingsStore.getInstanceQueues();
    for (const [id, items] of Object.entries(saved)) {
      this.queues.set(id, items);
    }

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
      try {
        const settings = this.settingsStore.getGlobalSettings();
        await this.gitManager.commitAndPush({
          workingDirectory: '.',
          branch: settings.githubDefaultBranch,
          message: 'auto-commit from Multiterminal',
        });
        this.window.webContents.send(IPC.GIT_RESULT, { success: true });
      } catch (err: any) {
        this.window.webContents.send(IPC.GIT_RESULT, { success: false, error: err.message });
      }
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
