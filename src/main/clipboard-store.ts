import Store from 'electron-store';
import { PasteEntry } from '../shared/types';
import { MAX_PASTE_HISTORY } from '../shared/constants';
import { randomUUID } from 'crypto';

export class ClipboardStore {
  private store: Store;

  constructor() {
    this.store = new Store({ name: 'multiterminal-clipboard' });
  }

  log(entry: Omit<PasteEntry, 'id'>): void {
    const entries = this.getAll();
    entries.unshift({ ...entry, id: randomUUID() });
    if (entries.length > MAX_PASTE_HISTORY) {
      entries.length = MAX_PASTE_HISTORY;
    }
    this.store.set('history', entries);
  }

  getAll(): PasteEntry[] {
    return this.store.get('history', []) as PasteEntry[];
  }

  search(query: string): PasteEntry[] {
    const lower = query.toLowerCase();
    return this.getAll().filter(e => e.text.toLowerCase().includes(lower));
  }

  clear(): void {
    this.store.set('history', []);
  }
}
