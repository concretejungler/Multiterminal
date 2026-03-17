import { useSettingsStore } from '../store/settings';

export function SkillsMcpPanel() {
  const skillsMcp = useSettingsStore(s => s.skillsMcp);
  const setSkillsMcp = useSettingsStore(s => s.setSkillsMcp);

  const toggleSkill = (name: string) => {
    setSkillsMcp({
      ...skillsMcp,
      globalSkills: { ...skillsMcp.globalSkills, [name]: !skillsMcp.globalSkills[name] },
    });
  };

  const toggleMcp = (name: string) => {
    setSkillsMcp({
      ...skillsMcp,
      globalMcp: { ...skillsMcp.globalMcp, [name]: !skillsMcp.globalMcp[name] },
    });
  };

  const toggleAll = (type: 'skills' | 'mcp', value: boolean) => {
    const source = type === 'skills' ? skillsMcp.globalSkills : skillsMcp.globalMcp;
    const updated = Object.fromEntries(Object.keys(source).map(k => [k, value]));
    setSkillsMcp({
      ...skillsMcp,
      [type === 'skills' ? 'globalSkills' : 'globalMcp']: updated,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium text-gray-400 uppercase">Skills</h4>
          <button onClick={() => toggleAll('skills', true)} className="text-xs text-blue-400 hover:text-blue-300">Enable all</button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(skillsMcp.globalSkills).map(([name, enabled]) => (
            <label key={name} className="flex items-center gap-2 text-xs text-gray-300 py-1 px-2 hover:bg-gray-800 rounded">
              <input type="checkbox" checked={enabled} onChange={() => toggleSkill(name)} />
              {name}
            </label>
          ))}
        </div>
        {Object.keys(skillsMcp.globalSkills).length === 0 && (
          <p className="text-xs text-gray-600 italic">No skills discovered yet</p>
        )}
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-medium text-gray-400 uppercase">MCP Servers</h4>
          <button onClick={() => toggleAll('mcp', true)} className="text-xs text-blue-400 hover:text-blue-300">Enable all</button>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(skillsMcp.globalMcp).map(([name, enabled]) => (
            <label key={name} className="flex items-center gap-2 text-xs text-gray-300 py-1 px-2 hover:bg-gray-800 rounded">
              <input type="checkbox" checked={enabled} onChange={() => toggleMcp(name)} />
              {name}
            </label>
          ))}
        </div>
        {Object.keys(skillsMcp.globalMcp).length === 0 && (
          <p className="text-xs text-gray-600 italic">No MCP servers discovered yet</p>
        )}
      </div>
    </div>
  );
}
