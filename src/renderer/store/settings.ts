import { create } from 'zustand';
import { GlobalSettings, SkillsMcpConfig } from '../../shared/types';
import { DEFAULTS } from '../../shared/constants';

declare const window: Window & { api: any };

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
    const data = await window.api.getSettings();
    set({ global: { ...DEFAULTS, ...data.global }, skillsMcp: data.skillsMcp });
  },

  save: async () => {
    const { global, skillsMcp } = get();
    await window.api.setSettings({ global, skillsMcp });
  },
}));
