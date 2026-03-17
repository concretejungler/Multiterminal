import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // PTY
  createPty: (config: { id: string; workingDirectory: string; skipPermissions: boolean }) =>
    ipcRenderer.invoke('pty:create', config),
  sendInput: (id: string, data: string) =>
    ipcRenderer.send('pty:input', id, data),
  resizePty: (id: string, cols: number, rows: number) =>
    ipcRenderer.send('pty:resize', id, cols, rows),
  killPty: (id: string) =>
    ipcRenderer.invoke('pty:kill', id),
  restartPty: (id: string) =>
    ipcRenderer.invoke('pty:restart', id),

  // Listeners
  onPtyData: (callback: (id: string, data: string) => void) => {
    const listener = (_: any, id: string, data: string) => callback(id, data);
    ipcRenderer.on('pty:data', listener);
    return () => ipcRenderer.removeListener('pty:data', listener);
  },
  onPtyStatus: (callback: (id: string, status: any) => void) => {
    const listener = (_: any, id: string, status: any) => callback(id, status);
    ipcRenderer.on('pty:status', listener);
    return () => ipcRenderer.removeListener('pty:status', listener);
  },
  onPtyError: (callback: (id: string, error: any) => void) => {
    const listener = (_: any, id: string, error: any) => callback(id, error);
    ipcRenderer.on('pty:error', listener);
    return () => ipcRenderer.removeListener('pty:error', listener);
  },
  onQueueSendNext: (callback: (id: string) => void) => {
    const listener = (_: any, id: string) => callback(id);
    ipcRenderer.on('queue:send-next', listener);
    return () => ipcRenderer.removeListener('queue:send-next', listener);
  },
  onNotificationDone: (callback: (id: string, config: any) => void) => {
    const listener = (_: any, id: string, config: any) => callback(id, config);
    ipcRenderer.on('notification:done', listener);
    return () => ipcRenderer.removeListener('notification:done', listener);
  },

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings: any) => ipcRenderer.invoke('settings:set', settings),

  // Git
  gitPush: (config: any) => ipcRenderer.invoke('git:push', config),

  // Clipboard
  logPaste: (entry: any) => ipcRenderer.send('clipboard:log', entry),
  getClipboardHistory: (query?: string) => ipcRenderer.invoke('clipboard:history', query),

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
