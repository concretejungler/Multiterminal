import { useState } from 'react';
import { useSettingsStore } from '../store/settings';
import { useInstancesStore } from '../store/instances';
import { ConfigPanel } from './ConfigPanel';

export function SettingsSidebar() {
  const { sidebarOpen, global: settings, setGlobal, toggleSidebar } = useSettingsStore();
  const activeId = useInstancesStore(s => s.activeInstanceId);
  const [scope, setScope] = useState<'global' | 'instance'>('global');
  const [showAppSettings, setShowAppSettings] = useState(false);

  if (!sidebarOpen) return null;

  return (
    <div className="w-[480px] bg-gray-900 border-l border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-200">Configuration</h3>
          <div className="flex gap-1 ml-2">
            <button
              onClick={() => { setScope('global'); setShowAppSettings(false); }}
              className={`px-2 py-0.5 text-xs rounded ${scope === 'global' && !showAppSettings ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}
            >
              Global
            </button>
            {activeId && (
              <button
                onClick={() => { setScope('instance'); setShowAppSettings(false); }}
                className={`px-2 py-0.5 text-xs rounded ${scope === 'instance' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}
              >
                Instance
              </button>
            )}
            <button
              onClick={() => setShowAppSettings(true)}
              className={`px-2 py-0.5 text-xs rounded ${showAppSettings ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400'}`}
            >
              App
            </button>
          </div>
        </div>
        <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-200">✕</button>
      </div>

      {/* Content */}
      {showAppSettings ? (
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <h4 className="text-xs font-medium text-gray-400 uppercase">App Settings</h4>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.soundEnabled} onChange={e => setGlobal({ soundEnabled: e.target.checked })} />
            <span className="text-sm text-gray-300">Sound notifications</span>
          </label>
          {settings.soundEnabled && (
            <>
              <label className="block">
                <span className="text-xs text-gray-400">Sound</span>
                <select className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700" value={settings.soundChoice} onChange={e => setGlobal({ soundChoice: e.target.value as any })}>
                  <option value="chime">Chime</option>
                  <option value="bell">Bell</option>
                  <option value="ding">Ding</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-gray-400">Volume ({Math.round(settings.soundVolume * 100)}%)</span>
                <input type="range" min="0" max="1" step="0.1" value={settings.soundVolume} onChange={e => setGlobal({ soundVolume: parseFloat(e.target.value) })} className="w-full mt-1" />
              </label>
            </>
          )}
          <label className="block">
            <span className="text-xs text-gray-400">Theme</span>
            <select className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700" value={settings.theme} onChange={e => setGlobal({ theme: e.target.value as any })}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-400">GitHub Default Branch</span>
            <input className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700" value={settings.githubDefaultBranch} onChange={e => setGlobal({ githubDefaultBranch: e.target.value })} />
          </label>
        </div>
      ) : (
        <ConfigPanel instanceId={scope === 'instance' ? activeId || undefined : undefined} />
      )}
    </div>
  );
}
