import { useClipboardStore } from '../store/clipboard';

interface ClipboardHistoryProps {
  onPaste: (text: string) => void;
}

export function ClipboardHistory({ onPaste }: ClipboardHistoryProps) {
  const { panelOpen, togglePanel, searchQuery, setSearchQuery, filteredEntries } = useClipboardStore();

  if (!panelOpen) return null;

  const entries = filteredEntries();

  return (
    <div className="fixed right-0 top-10 bottom-0 w-80 bg-gray-900 border-l border-gray-800 z-40 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-gray-200">Paste History</h3>
        <button onClick={togglePanel} className="text-gray-500 hover:text-gray-200">✕</button>
      </div>
      <div className="px-4 py-2">
        <input
          className="w-full bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700"
          placeholder="Search..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {entries.map(entry => (
          <button
            key={entry.id}
            onClick={() => onPaste(entry.text)}
            className="w-full text-left px-4 py-2 hover:bg-gray-800 border-b border-gray-800/50"
          >
            <div className="text-xs text-gray-500">
              {new Date(entry.timestamp).toLocaleTimeString()} — {entry.instanceName}
            </div>
            <div className="text-sm text-gray-300 truncate mt-0.5">
              {entry.text.slice(0, 100)}
            </div>
          </button>
        ))}
        {entries.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-gray-600">
            No paste history yet
          </div>
        )}
      </div>
    </div>
  );
}
