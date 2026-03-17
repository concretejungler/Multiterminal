import { create } from 'zustand';
import { PasteEntry } from '../../shared/types';

declare const window: Window & { api: any };

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
    const entries = await window.api.getClipboardHistory();
    set({ entries });
  },

  logPaste: (text, instanceId, instanceName) => {
    const entry = { timestamp: Date.now(), text, instanceId, instanceName };
    window.api.logPaste(entry);
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
