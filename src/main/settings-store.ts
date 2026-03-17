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
