import { useInstancesStore } from '../store/instances';
import { useSettingsStore } from '../store/settings';

interface TabBarProps {
  onNewInstance: () => void;
}

export function TabBar({ onNewInstance }: TabBarProps) {
  const instances = useInstancesStore(s => s.instances);
  const activeId = useInstancesStore(s => s.activeInstanceId);
  const setActive = useInstancesStore(s => s.setActive);
  const removeInstance = useInstancesStore(s => s.removeInstance);
  const toggleSidebar = useSettingsStore(s => s.toggleSidebar);

  const statusIcon = (status: string) => {
    const icons: Record<string, string> = { idle: '\u2713', working: '\u27F3', 'waiting-for-input': '\u26A0', error: '\u2715', stopped: '\u25A0' };
    return icons[status] || '?';
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = { idle: 'text-green-400', working: 'text-blue-400', 'waiting-for-input': 'text-yellow-400', error: 'text-red-400', stopped: 'text-gray-500' };
    return colors[status] || 'text-gray-500';
  };

  return (
    <div className="flex items-center h-10 bg-gray-900 border-b border-gray-800 px-1 gap-0.5 select-none">
      {Array.from(instances.values()).map(inst => (
        <div
          key={inst.id}
          onClick={() => setActive(inst.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-t cursor-pointer group ${
            activeId === inst.id
              ? 'bg-gray-950 text-gray-100 border-t border-x border-gray-700'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
        >
          <span className={`text-xs ${statusColor(inst.status)}`}>{statusIcon(inst.status)}</span>
          <span className="truncate max-w-[120px]">{inst.name}</span>
          <button
            onClick={e => { e.stopPropagation(); removeInstance(inst.id); }}
            className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 ml-1"
          >
            ✕
          </button>
        </div>
      ))}
      <button onClick={onNewInstance} className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded" title="New instance">+</button>
      <div className="flex-1" />
      <button onClick={toggleSidebar} className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded" title="Settings">⚙</button>
    </div>
  );
}
