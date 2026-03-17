import { useState } from 'react';
import { useSettingsStore } from '../store/settings';
import { MAX_INSTANCES, WARN_INSTANCES } from '../../shared/constants';

interface NewInstanceDialogProps {
  instanceCount: number;
  onClose: () => void;
  onCreate: (name: string, workingDirectory: string, skipPermissions: boolean) => void;
}

export function NewInstanceDialog({ instanceCount, onClose, onCreate }: NewInstanceDialogProps) {
  const defaultDir = useSettingsStore(s => s.global.defaultWorkingDirectory);
  const defaultSkip = useSettingsStore(s => s.global.defaultSkipPermissions);
  const [name, setName] = useState(`Claude-${instanceCount + 1}`);
  const [dir, setDir] = useState(defaultDir);
  const [skip, setSkip] = useState(defaultSkip);

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-96" onClick={e => e.stopPropagation()}>
        <h3 className="text-gray-100 font-medium mb-4">New Claude Instance</h3>
        {instanceCount >= WARN_INSTANCES && (
          <div className="mb-3 p-2 bg-yellow-900/30 border border-yellow-700/50 rounded text-xs text-yellow-400">
            Running many Claude instances uses significant memory.
          </div>
        )}
        <label className="block mb-3">
          <span className="text-xs text-gray-400">Name</span>
          <input className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-2 rounded border border-gray-700" value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label className="block mb-3">
          <span className="text-xs text-gray-400">Working Directory</span>
          <input className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-2 rounded border border-gray-700" value={dir} onChange={e => setDir(e.target.value)} placeholder="Leave empty for home directory" />
        </label>
        <label className="flex items-center gap-2 mb-4">
          <input type="checkbox" checked={skip} onChange={e => setSkip(e.target.checked)} />
          <span className="text-sm text-gray-300">Skip permissions</span>
        </label>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200">Cancel</button>
          <button onClick={() => onCreate(name, dir, skip)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded">Create</button>
        </div>
      </div>
    </div>
  );
}
