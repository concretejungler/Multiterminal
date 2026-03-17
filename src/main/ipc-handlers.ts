import { ipcMain, BrowserWindow, app } from 'electron';
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

  // Queue management
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
  app.on('before-quit', () => {
    ptyManager.killAll();
  });
}
