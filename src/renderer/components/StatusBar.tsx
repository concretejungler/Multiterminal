import { useState } from 'react';
import { useInstancesStore } from '../store/instances';

declare const window: Window & { api: any };

interface StatusBarProps {
  instanceId: string;
}

export function StatusBar({ instanceId }: StatusBarProps) {
  const instance = useInstancesStore(s => s.instances.get(instanceId));
  const toggleSound = useInstancesStore(s => s.toggleSound);
  const renameInstance = useInstancesStore(s => s.renameInstance);
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');

  if (!instance) return null;

  const statusIcon: Record<string, string> = {
    idle: '\u2713',
    working: '\u27F3',
    'waiting-for-input': '\u26A0',
    error: '\u2715',
    stopped: '\u25A0',
  };

  const statusColor: Record<string, string> = {
    idle: 'text-green-400',
    working: 'text-blue-400',
    'waiting-for-input': 'text-yellow-400',
    error: 'text-red-400',
    stopped: 'text-gray-500',
  };

  const handleDoubleClick = () => {
    setNameInput(instance.name);
    setEditing(true);
  };

  const handleNameSubmit = () => {
    if (nameInput.trim()) renameInstance(instanceId, nameInput.trim());
    setEditing(false);
  };

  return (
    <div className="flex items-center h-8 px-3 bg-gray-900 border-b border-gray-800 text-sm gap-3">
      <span className={statusColor[instance.status] || 'text-gray-500'}>
        {statusIcon[instance.status] || '?'}
      </span>

      {editing ? (
        <input
          className="bg-gray-800 text-gray-100 px-1 rounded text-sm w-32"
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onBlur={handleNameSubmit}
          onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
          autoFocus
        />
      ) : (
        <span className="text-gray-300 cursor-pointer" onDoubleClick={handleDoubleClick}>
          {instance.name}
        </span>
      )}

      <span className="text-gray-500 truncate flex-1">
        {instance.taskDescription || (instance.status === 'working' ? 'Working...' : '')}
      </span>

      {instance.status === 'working' && (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            {instance.progressPercent !== null ? (
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${instance.progressPercent}%` }}
              />
            ) : (
              <div className="h-full bg-blue-500 rounded-full animate-pulse w-full opacity-30" />
            )}
          </div>
          {instance.progressPercent !== null && (
            <span className="text-xs text-gray-400">{instance.progressPercent}%</span>
          )}
        </div>
      )}

      {instance.status === 'waiting-for-input' && (
        <button
          onClick={() => window.api.forceIdle(instanceId)}
          className="text-xs text-yellow-400 hover:text-yellow-300 px-2"
        >
          Mark idle
        </button>
      )}

      <button
        onClick={() => toggleSound(instanceId)}
        className={`text-sm ${instance.soundEnabled ? 'text-gray-300' : 'text-gray-600'}`}
        title={instance.soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
      >
        {instance.soundEnabled ? '\uD83D\uDD14' : '\uD83D\uDD15'}
      </button>
      <button
        onClick={async () => {
          const prompt = await window.api.saveSessionMemoryPrompt(instanceId);
          if (prompt) window.api.sendInput(instanceId, prompt + '\n');
        }}
        className="text-xs text-gray-500 hover:text-gray-300 px-1"
        title="Save session memory"
      >
        💾
      </button>
    </div>
  );
}
