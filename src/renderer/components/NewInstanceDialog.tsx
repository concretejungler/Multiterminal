import { useState } from 'react';
import { useSettingsStore } from '../store/settings';
import { MAX_INSTANCES, WARN_INSTANCES } from '../../shared/constants';

declare const window: Window & { api: any };

interface NewInstanceDialogProps {
  instanceCount: number;
  onClose: () => void;
  onCreate: (name: string, workingDirectory: string, skipPermissions: boolean) => void;
}

export function NewInstanceDialog({ instanceCount, onClose, onCreate }: NewInstanceDialogProps) {
  const [name, setName] = useState('');
  const [customDir, setCustomDir] = useState('');
  const [error, setError] = useState('');

  if (instanceCount >= MAX_INSTANCES) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-96" onClick={e => e.stopPropagation()}>
          <h3 className="text-red-400 font-medium mb-2">Maximum instances reached</h3>
          <p className="text-sm text-gray-400">You can run up to {MAX_INSTANCES} Claude instances.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-700 text-gray-200 rounded text-sm">Close</button>
        </div>
      </div>
    );
  }

  const handleBrowse = async () => {
    const selected = await window.api.selectFolder();
    if (selected) {
      setCustomDir(selected);
      setError('');
    }
  };

  const clearCustomDir = () => {
    setCustomDir('');
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    let dir = customDir;
    if (!dir) {
      // Create folder on desktop with the instance name
      dir = await window.api.createDesktopFolder(name.trim());
    }

    onCreate(name.trim(), dir, false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-[420px]" onClick={e => e.stopPropagation()}>
        <h3 className="text-gray-100 font-medium mb-4">New Claude Instance</h3>
        {instanceCount >= WARN_INSTANCES && (
          <div className="mb-3 p-2 bg-yellow-900/30 border border-yellow-700/50 rounded text-xs text-yellow-400">
            Running many Claude instances uses significant memory.
          </div>
        )}

        <label className="block mb-3">
          <span className="text-xs text-gray-400">Name <span className="text-red-400">*</span></span>
          <input
            className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            value={name}
            onChange={e => { setName(e.target.value); setError(''); }}
            placeholder="e.g. my-project"
            autoFocus
          />
        </label>

        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}

        <div className="mb-3">
          <span className="text-xs text-gray-400">Working Directory</span>
          {customDir ? (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-gray-800 text-gray-300 text-sm px-3 py-2 rounded border border-gray-700 truncate">
                {customDir}
              </div>
              <button
                onClick={clearCustomDir}
                className="px-2 py-2 text-gray-500 hover:text-red-400 text-sm"
                title="Use desktop folder instead"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-gray-800 text-gray-500 text-sm px-3 py-2 rounded border border-gray-700/50 italic">
                ~/Desktop/{name.trim() || '...'}
              </div>
              <button
                onClick={handleBrowse}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded whitespace-nowrap"
              >
                Browse...
              </button>
            </div>
          )}
          <p className="text-xs text-gray-600 mt-1">
            {customDir ? 'Using custom folder.' : 'A folder with this name will be created on your Desktop.'}
          </p>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
