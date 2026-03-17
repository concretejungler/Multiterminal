import { useState, useEffect } from 'react';

declare const window: Window & { api: any };

interface SettingsTabProps {
  instanceId?: string;
}

export function SettingsTab({ instanceId }: SettingsTabProps) {
  const [settingsJson, setSettingsJson] = useState('');
  const [scope, setScope] = useState<'user' | 'project'>('project');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadSettings(); }, [scope, instanceId]);

  const loadSettings = async () => {
    try {
      const content = await window.api.getClaudeSettings(scope);
      setSettingsJson(content || '{\n  \n}');
      setDirty(false);
      setError('');
    } catch { setSettingsJson('{}'); }
  };

  const handleSave = async () => {
    try {
      JSON.parse(settingsJson); // validate JSON
    } catch (e: any) {
      setError(`Invalid JSON: ${e.message}`);
      return;
    }
    setSaving(true);
    await window.api.saveClaudeSettings(scope, settingsJson);
    setSaving(false);
    setDirty(false);
    setError('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800">
        <div className="flex gap-1">
          <button
            onClick={() => setScope('project')}
            className={`px-3 py-1 text-xs rounded ${scope === 'project' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
          >
            Project
          </button>
          <button
            onClick={() => setScope('user')}
            className={`px-3 py-1 text-xs rounded ${scope === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
          >
            User (~/.claude)
          </button>
        </div>
        <div className="flex-1" />
        {error && <span className="text-xs text-red-400">{error}</span>}
        {dirty && <span className="text-xs text-yellow-500">Unsaved</span>}
        <button onClick={handleSave} disabled={!dirty || saving} className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white rounded">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      <div className="px-4 py-2 text-xs text-gray-600 border-b border-gray-800">
        {scope === 'project' ? '.claude/settings.json — shared project settings' : '~/.claude/settings.json — personal global settings'}
      </div>
      <textarea
        className="flex-1 bg-gray-950 text-gray-200 text-sm font-mono p-4 resize-none focus:outline-none"
        value={settingsJson}
        onChange={e => { setSettingsJson(e.target.value); setDirty(true); setError(''); }}
        spellCheck={false}
      />
    </div>
  );
}
