import { useState } from 'react';
import { useInstancesStore } from '../store/instances';
import { QueueItem } from '../../shared/types';

declare const window: Window & { api: any };

interface InputBarProps {
  instanceId: string;
  onSend: (text: string) => void;
  isStarted: boolean;
  onStart: (skipPermissions: boolean) => void;
}

export function InputBar({ instanceId, onSend, isStarted, onStart }: InputBarProps) {
  const [input, setInput] = useState('');
  const queue = useInstancesStore(s => s.instances.get(instanceId)?.queue ?? []);
  const updateQueue = useInstancesStore(s => s.updateQueue);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };

  const handleQueue = () => {
    if (!input.trim()) return;
    const item: QueueItem = { id: crypto.randomUUID(), type: 'command', command: input.trim() };
    updateQueue(instanceId, [...queue, item]);
    window.api.queueAdd(instanceId, item);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleQueue();
    } else if (e.key === 'Enter' && !e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isStarted) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-t border-gray-800">
        <button onClick={() => onStart(false)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded">
          Start Claude
        </button>
        <button onClick={() => onStart(true)} className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded flex items-center gap-1">
          ▶ Skip Permissions
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-t border-gray-800">
      <input
        className="flex-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
        placeholder="Type a command... (Enter to send, Ctrl+Enter to queue)"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button onClick={handleSend} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded">
        Send
      </button>
    </div>
  );
}
