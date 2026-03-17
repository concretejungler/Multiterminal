import { Notification, BrowserWindow } from 'electron';
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

    this.window.webContents.send(IPC.NOTIFICATION_DONE, instanceId, {
      sound: settings.soundChoice,
      volume: settings.soundVolume,
    });

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
