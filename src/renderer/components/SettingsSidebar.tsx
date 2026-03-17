import { useSettingsStore } from '../store/settings';
import { SkillsMcpPanel } from './SkillsMcpPanel';
import { WorkflowPresets } from './WorkflowPresets';

export function SettingsSidebar() {
  const { sidebarOpen, global: settings, setGlobal, toggleSidebar } = useSettingsStore();

  if (!sidebarOpen) return null;

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-medium text-gray-200">Settings</h3>
        <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-200">✕</button>
      </div>
      <div className="p-4 space-y-6">
        <div className="space-y-3">
          <h4 className="text-xs font-medium text-gray-400 uppercase">General</h4>
          <label className="block">
            <span className="text-xs text-gray-400">Default Working Directory</span>
            <input className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700" value={settings.defaultWorkingDirectory} onChange={e => setGlobal({ defaultWorkingDirectory: e.target.value })} />
          </label>
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
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={settings.defaultSkipPermissions} onChange={e => setGlobal({ defaultSkipPermissions: e.target.checked })} />
            <span className="text-sm text-gray-300">Skip permissions by default</span>
          </label>
          <label className="block">
            <span className="text-xs text-gray-400">GitHub Default Branch</span>
            <input className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700" value={settings.githubDefaultBranch} onChange={e => setGlobal({ githubDefaultBranch: e.target.value })} />
          </label>
        </div>
        <SkillsMcpPanel />
        <WorkflowPresets />
      </div>
    </div>
  );
}
