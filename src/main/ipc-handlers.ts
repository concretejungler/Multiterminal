import { ipcMain, BrowserWindow, app, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { IPC, MAX_INSTANCES, WARN_INSTANCES } from '../shared/constants';
import { PtyManager } from './pty-manager';
import { QueueManager } from './queue-manager';
import { NotificationManager } from './notification-manager';
import { GitManager } from './git-manager';
import { SettingsStore } from './settings-store';
import { ClipboardStore } from './clipboard-store';
import { ConfigManager } from './config-manager';

export function registerIpcHandlers(window: BrowserWindow): void {
  const settingsStore = new SettingsStore();
  const gitManager = new GitManager();
  const ptyManager = new PtyManager(window);
  const notificationManager = new NotificationManager(window, settingsStore);
  const queueManager = new QueueManager(window, ptyManager, settingsStore, gitManager);
  const clipboardStore = new ClipboardStore();
  const configManager = new ConfigManager();

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

  // Folder picker dialog
  ipcMain.handle('dialog:select-folder', async (_, defaultPath?: string) => {
    const desktop = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Desktop');
    const result = await dialog.showOpenDialog(window, {
      title: 'Select Working Directory',
      defaultPath: defaultPath || desktop,
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // Create folder on desktop and return its path
  ipcMain.handle('dialog:create-desktop-folder', async (_, folderName: string) => {
    const desktop = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Desktop');
    const folderPath = path.join(desktop, folderName);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    return folderPath;
  });

  // Config Manager — CLAUDE.md
  ipcMain.handle('config:get-claude-md-files', async (_, instanceId?: string) => {
    // Get working directory from instanceConfigs if instanceId provided
    const workDir = instanceId ? instanceConfigs.get(instanceId)?.workingDirectory : undefined;
    return configManager.getClaudeMdFiles(workDir);
  });

  ipcMain.handle('config:save-claude-md-file', async (_, filePath: string, content: string) => {
    configManager.saveClaudeMdFile(filePath, content);
  });

  // Config Manager — Skills
  ipcMain.handle('config:get-skills', async (_, instanceId?: string) => {
    const workDir = instanceId ? instanceConfigs.get(instanceId)?.workingDirectory : undefined;
    return configManager.getSkills(workDir);
  });

  ipcMain.handle('config:toggle-skill', async (_, skillPath: string, enabled: boolean, instanceId?: string) => {
    // For now, skills are always enabled if discovered. This could be extended.
    return;
  });

  // Config Manager — MCP Servers
  ipcMain.handle('config:get-mcp-servers', async (_, instanceId?: string) => {
    const workDir = instanceId ? instanceConfigs.get(instanceId)?.workingDirectory : undefined;
    return configManager.getMcpServers(workDir);
  });

  ipcMain.handle('config:add-mcp-server', async (_, config: any) => {
    if (config.scope === 'project') {
      // Need a working directory - use the first instance's or a default
      const firstConfig = instanceConfigs.values().next().value;
      const workDir = firstConfig?.workingDirectory || '';
      if (workDir) configManager.addMcpServerToProject(workDir, config);
    } else {
      configManager.addMcpServer(config);
    }
  });

  ipcMain.handle('config:toggle-mcp-server', async (_, name: string, enabled: boolean, instanceId?: string) => {
    return;
  });

  ipcMain.handle('config:remove-mcp-server', async (_, name: string, scope: string) => {
    const firstConfig = instanceConfigs.values().next().value;
    const workDir = firstConfig?.workingDirectory || '';
    configManager.removeMcpServer(name, scope, workDir);
  });

  // Config Manager — Settings JSON
  ipcMain.handle('config:get-claude-settings', async (_, scope: 'user' | 'project') => {
    const firstConfig = instanceConfigs.values().next().value;
    const workDir = firstConfig?.workingDirectory || '';
    return configManager.getClaudeSettings(scope, workDir);
  });

  ipcMain.handle('config:save-claude-settings', async (_, scope: 'user' | 'project', content: string) => {
    const firstConfig = instanceConfigs.values().next().value;
    const workDir = firstConfig?.workingDirectory || '';
    configManager.saveClaudeSettings(scope, content, workDir);
  });

  // Config Manager — Generic file ops
  ipcMain.handle('config:read-file', async (_, filePath: string) => {
    return configManager.readFile(filePath);
  });

  ipcMain.handle('config:save-file', async (_, filePath: string, content: string) => {
    configManager.saveFile(filePath, content);
  });

  // Session Memory
  ipcMain.handle('session:save-memory-prompt', async (_, instanceId: string) => {
    const config = instanceConfigs.get(instanceId);
    if (!config) return null;
    return configManager.saveSessionMemory(config.workingDirectory);
  });

  ipcMain.handle('session:get-memory', async (_, instanceId: string) => {
    const config = instanceConfigs.get(instanceId);
    if (!config) return null;
    return configManager.getSessionMemory(config.workingDirectory);
  });

  // Cleanup on app quit
  app.on('before-quit', () => {
    ptyManager.killAll();
  });
}
