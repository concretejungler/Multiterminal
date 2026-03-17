import { useState, useEffect } from 'react';

declare const window: Window & { api: any };

interface Skill {
  name: string;
  description: string;
  path: string;
  scope: 'user' | 'project' | 'plugin';
  enabled: boolean;
  content?: string;
}

export function SkillsTab() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [editContent, setEditContent] = useState('');
  const [filter, setFilter] = useState('');

  useEffect(() => { loadSkills(); }, []);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const result = await window.api.getSkills();
      setSkills(result || []);
    } catch { setSkills([]); }
    setLoading(false);
  };

  const toggleSkill = async (skill: Skill) => {
    await window.api.toggleSkill(skill.path, !skill.enabled, undefined);
    loadSkills();
  };

  const editSkill = async (skill: Skill) => {
    const content = await window.api.readFile(skill.path);
    setEditingSkill(skill);
    setEditContent(content || '');
  };

  const saveSkill = async () => {
    if (!editingSkill) return;
    await window.api.saveFile(editingSkill.path, editContent);
    setEditingSkill(null);
    loadSkills();
  };

  const createSkill = async () => {
    const name = prompt('Skill name (e.g. my-custom-skill):');
    if (!name) return;
    const template = `---
name: ${name}
description: "Describe when this skill should be used"
user-invocable: true
---

# ${name}

Add your skill instructions here.
`;
    const skillPath = `.claude/skills/${name}/SKILL.md`;
    await window.api.saveFile(skillPath, template);
    loadSkills();
  };

  const filtered = skills.filter(s =>
    !filter || s.name.toLowerCase().includes(filter.toLowerCase()) || s.description.toLowerCase().includes(filter.toLowerCase())
  );

  const scopeColor = (scope: string) => {
    switch (scope) {
      case 'user': return 'bg-green-900/30 text-green-400';
      case 'project': return 'bg-blue-900/30 text-blue-400';
      case 'plugin': return 'bg-purple-900/30 text-purple-400';
      default: return 'bg-gray-800 text-gray-400';
    }
  };

  if (editingSkill) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <button onClick={() => setEditingSkill(null)} className="text-gray-500 hover:text-gray-200 text-sm">← Back</button>
            <span className="text-sm text-gray-300">{editingSkill.name}</span>
          </div>
          <button onClick={saveSkill} className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded">Save</button>
        </div>
        <textarea
          className="flex-1 bg-gray-950 text-gray-200 text-sm font-mono p-4 resize-none focus:outline-none"
          value={editContent}
          onChange={e => setEditContent(e.target.value)}
          spellCheck={false}
        />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <input
          className="flex-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700"
          placeholder="Filter skills..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <button onClick={createSkill} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded whitespace-nowrap">
          + New Skill
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading skills...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-gray-600 text-center py-8">
          {filter ? 'No skills match your filter.' : 'No skills found. Create one or install a plugin.'}
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(skill => (
            <div key={skill.path} className="flex items-center gap-3 px-3 py-2 bg-gray-900/50 rounded hover:bg-gray-800/50 group">
              <input
                type="checkbox"
                checked={skill.enabled}
                onChange={() => toggleSkill(skill)}
                className="accent-blue-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-200">{skill.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${scopeColor(skill.scope)}`}>{skill.scope}</span>
                </div>
                <div className="text-xs text-gray-500 truncate">{skill.description}</div>
              </div>
              <button
                onClick={() => editSkill(skill)}
                className="text-xs text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 px-2"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
