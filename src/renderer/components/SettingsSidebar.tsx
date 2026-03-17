import { useSettingsStore } from '../store/settings';
import { ConfigPanel } from './ConfigPanel';

export function SettingsSidebar() {
  const { sidebarOpen, toggleSidebar } = useSettingsStore();

  if (!sidebarOpen) return null;

  return (
    <div className="w-[480px] bg-gray-900 border-l border-gray-800 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-gray-200">Configuration</h3>
        <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-200">✕</button>
      </div>
      <ConfigPanel />
    </div>
  );
}
