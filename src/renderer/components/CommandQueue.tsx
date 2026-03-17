import { useState } from 'react';
import { useInstancesStore } from '../store/instances';
import { QueueItem } from '../../shared/types';

declare const window: Window & { api: any };

interface CommandQueueProps {
  instanceId: string;
}

export function CommandQueue({ instanceId }: CommandQueueProps) {
  const queue = useInstancesStore(s => s.instances.get(instanceId)?.queue ?? []);
  const updateQueue = useInstancesStore(s => s.updateQueue);
  const [newCommand, setNewCommand] = useState('');

  const addCommand = () => {
    if (!newCommand.trim()) return;
    const item: QueueItem = {
      id: crypto.randomUUID(),
      type: 'command',
      command: newCommand.trim(),
    };
    const updated = [...queue, item];
    updateQueue(instanceId, updated);
    window.api.queueAdd(instanceId, item);
    setNewCommand('');
  };

  const addGitPush = () => {
    const item: QueueItem = { id: crypto.randomUUID(), type: 'git-push' };
    const updated = [...queue, item];
    updateQueue(instanceId, updated);
    window.api.queueAdd(instanceId, item);
  };

  const removeItem = (itemId: string) => {
    updateQueue(instanceId, queue.filter(q => q.id !== itemId));
    window.api.queueRemove(instanceId, itemId);
  };

  if (queue.length === 0 && !newCommand) {
    return null;
  }

  return (
    <div className="border-t border-gray-800 px-3 py-2">
      <div className="text-xs text-gray-400 mb-1">Queue ({queue.length})</div>
      <div className="max-h-32 overflow-y-auto">
        {queue.map((item, i) => (
          <div key={item.id} className="flex items-center gap-2 py-0.5 text-xs group">
            <span className="text-gray-600 w-4">{i + 1}.</span>
            <span className="flex-1 text-gray-300 truncate">
              {item.type === 'git-push' ? '📤 Push to GitHub' : item.command}
            </span>
            <button
              onClick={() => removeItem(item.id)}
              className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        <input
          className="flex-1 bg-gray-800 text-gray-200 text-xs px-2 py-1 rounded"
          placeholder="Add command to queue..."
          value={newCommand}
          onChange={e => setNewCommand(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCommand()}
        />
        <button onClick={addGitPush} className="text-xs text-gray-400 hover:text-gray-200 px-2" title="Queue git push">
          📤
        </button>
      </div>
    </div>
  );
}
