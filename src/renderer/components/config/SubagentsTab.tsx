import { useState, useEffect } from 'react';

declare const window: Window & { api: any };

interface SubagentDef {
  name: string;
  description: string;
  path: string;
  scope: 'user' | 'project';
  model: string;
  tools: string;
}

const BUILTIN_AGENTS = [
  { name: 'Explore', description: 'Fast read-only codebase search (Haiku)', icon: '🔍', type: 'Explore' },
  { name: 'Plan', description: 'Research & plan mode (read-only)', icon: '📋', type: 'Plan' },
  { name: 'General', description: 'Full access multi-step tasks', icon: '⚡', type: 'general-purpose' },
];

const TEMPLATES = [
  { name: 'code-reviewer', description: 'Expert code review specialist', model: 'sonnet', tools: 'Read, Grep, Glob, Bash', prompt: 'You are a senior code reviewer. When invoked:\n1. Run git diff to see recent changes\n2. Review for quality, security, and best practices\n3. Report issues with file:line references\n4. Suggest specific improvements' },
  { name: 'test-runner', description: 'Run and analyze test suites', model: 'sonnet', tools: 'Read, Bash, Grep, Glob', prompt: 'You are a test execution specialist. When invoked:\n1. Discover test files in the project\n2. Run the test suite\n3. Report failing tests with error details\n4. Suggest fixes for failures' },
  { name: 'security-auditor', description: 'Security vulnerability scanner', model: 'sonnet', tools: 'Read, Grep, Glob', prompt: 'You are a security auditor. When invoked:\n1. Scan for OWASP Top 10 vulnerabilities\n2. Check for hardcoded secrets and credentials\n3. Review authentication and authorization logic\n4. Report findings with severity ratings' },
  { name: 'doc-writer', description: 'Generate documentation from code', model: 'sonnet', tools: 'Read, Write, Grep, Glob', prompt: 'You are a technical documentation specialist. When invoked:\n1. Read the codebase to understand the architecture\n2. Generate clear, concise documentation\n3. Include usage examples and API references\n4. Write in a developer-friendly tone' },
  { name: 'refactor-assistant', description: 'Code refactoring and cleanup', model: 'sonnet', tools: 'Read, Edit, Grep, Glob, Bash', prompt: 'You are a refactoring specialist. When invoked:\n1. Identify code smells and duplication\n2. Propose targeted refactoring improvements\n3. Apply changes incrementally\n4. Verify nothing breaks after each change' },
];

export function SubagentsTab() {
  const [agents, setAgents] = useState<SubagentDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<SubagentDef | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('');

  // Create form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newModel, setNewModel] = useState('sonnet');
  const [newTools, setNewTools] = useState('Read, Grep, Glob, Bash');
  const [newScope, setNewScope] = useState<'user' | 'project'>('project');
  const [newPrompt, setNewPrompt] = useState('');

  useEffect(() => { loadAgents(); }, []);

  const loadAgents = async () => {
    setLoading(true);
    try {
      const result = await window.api.getSubagents();
      setAgents(result || []);
    } catch { setAgents([]); }
    setLoading(false);
  };

  const editAgent = async (agent: SubagentDef) => {
    const content = await window.api.readFile(agent.path);
    setEditingAgent(agent);
    setEditContent(content || '');
  };

  const saveAgent = async () => {
    if (!editingAgent) return;
    await window.api.saveFile(editingAgent.path, editContent);
    setEditingAgent(null);
    loadAgents();
  };

  const deleteAgent = async (agent: SubagentDef) => {
    if (!confirm(`Delete subagent "${agent.name}"?`)) return;
    await window.api.deleteFile(agent.path);
    loadAgents();
  };

  const createAgent = async () => {
    if (!newName.trim()) return;
    const content = `---
name: ${newName.trim()}
description: "${newDesc.trim()}"
tools: ${newTools}
model: ${newModel}
---

${newPrompt || 'Add your instructions here.'}
`;
    const dir = newScope === 'user' ? '~/.claude/agents' : '.claude/agents';
    await window.api.createSubagent(newName.trim(), content, newScope);
    setShowCreate(false);
    resetForm();
    loadAgents();
  };

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setNewName(tpl.name);
    setNewDesc(tpl.description);
    setNewModel(tpl.model);
    setNewTools(tpl.tools);
    setNewPrompt(tpl.prompt);
    setShowCreate(true);
  };

  const launchAgent = (agentName: string) => {
    // Dispatch event to AppShell to create a new instance with this agent
    window.dispatchEvent(new CustomEvent('launch-subagent', { detail: { agentName } }));
  };

  const resetForm = () => {
    setNewName(''); setNewDesc(''); setNewModel('sonnet'); setNewTools('Read, Grep, Glob, Bash'); setNewScope('project'); setNewPrompt('');
  };

  const filtered = agents.filter(a =>
    !filter || a.name.toLowerCase().includes(filter.toLowerCase()) || a.description.toLowerCase().includes(filter.toLowerCase())
  );

  // Editing view
  if (editingAgent) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <button onClick={() => setEditingAgent(null)} className="text-gray-500 hover:text-gray-200 text-sm">← Back</button>
            <span className="text-sm text-gray-300">{editingAgent.name}</span>
          </div>
          <button onClick={saveAgent} className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded">Save</button>
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
    <div className="p-4 space-y-4 overflow-y-auto">
      {/* Built-in agents */}
      <div>
        <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">Built-in Agents</h3>
        <div className="grid grid-cols-3 gap-2">
          {BUILTIN_AGENTS.map(a => (
            <button
              key={a.type}
              onClick={() => launchAgent(a.type)}
              className="flex flex-col items-center gap-1 p-3 bg-gray-900/50 rounded hover:bg-gray-800/50 border border-gray-800 hover:border-gray-700"
            >
              <span className="text-lg">{a.icon}</span>
              <span className="text-xs text-gray-200">{a.name}</span>
              <span className="text-[10px] text-gray-500 text-center">{a.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom agents */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-medium text-gray-400 uppercase flex-1">Custom Subagents</h3>
          <button onClick={() => { resetForm(); setShowCreate(!showCreate); }} className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded">
            {showCreate ? 'Cancel' : '+ New Agent'}
          </button>
        </div>

        {/* Filter */}
        {agents.length > 3 && (
          <input
            className="w-full bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700 mb-2"
            placeholder="Filter agents..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        )}

        {/* Create form */}
        {showCreate && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-3 mb-3">
            <div className="text-xs font-medium text-gray-400 uppercase">Create Subagent</div>

            {/* Templates */}
            <div>
              <div className="text-xs text-gray-500 mb-1">Quick start from template:</div>
              <div className="flex flex-wrap gap-1">
                {TEMPLATES.map(t => (
                  <button key={t.name} onClick={() => applyTemplate(t)} className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded">
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-400">Name</span>
                <input className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700" value={newName} onChange={e => setNewName(e.target.value)} placeholder="my-agent" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-400">Model</span>
                <select className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700" value={newModel} onChange={e => setNewModel(e.target.value)}>
                  <option value="opus">Opus (most capable)</option>
                  <option value="sonnet">Sonnet (balanced)</option>
                  <option value="haiku">Haiku (fast/cheap)</option>
                </select>
              </label>
            </div>
            <label className="block">
              <span className="text-xs text-gray-400">Description (when should this agent be used?)</span>
              <input className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Reviews code for quality and security" />
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">Tools (comma-separated)</span>
              <input className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700" value={newTools} onChange={e => setNewTools(e.target.value)} placeholder="Read, Grep, Glob, Bash" />
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="radio" name="agent-scope" checked={newScope === 'project'} onChange={() => setNewScope('project')} /> Project
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="radio" name="agent-scope" checked={newScope === 'user'} onChange={() => setNewScope('user')} /> User (global)
              </label>
            </div>
            <label className="block">
              <span className="text-xs text-gray-400">System Prompt / Instructions</span>
              <textarea className="w-full mt-1 bg-gray-800 text-gray-100 text-sm font-mono px-3 py-1.5 rounded border border-gray-700 h-32 resize-none" value={newPrompt} onChange={e => setNewPrompt(e.target.value)} placeholder="You are a specialized agent. When invoked:&#10;1. First step&#10;2. Second step" />
            </label>
            <button onClick={createAgent} disabled={!newName.trim()} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white text-sm rounded">
              Create Agent
            </button>
          </div>
        )}

        {/* Agent list */}
        {loading ? (
          <div className="text-sm text-gray-500">Loading agents...</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-gray-600 text-center py-6">
            {filter ? 'No agents match your filter.' : 'No custom subagents yet. Create one above or use a template.'}
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map(agent => (
              <div key={agent.path} className="flex items-center gap-3 px-3 py-2.5 bg-gray-900/50 rounded hover:bg-gray-800/50 group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-200 font-medium">{agent.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${agent.scope === 'user' ? 'bg-green-900/30 text-green-400' : 'bg-blue-900/30 text-blue-400'}`}>{agent.scope}</span>
                    <span className="text-[10px] text-gray-600">{agent.model}</span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">{agent.description}</div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  <button onClick={() => launchAgent(agent.name)} className="text-xs text-green-500 hover:text-green-400 px-2" title="Launch as new tab">▶</button>
                  <button onClick={() => editAgent(agent)} className="text-xs text-gray-500 hover:text-gray-300 px-2">Edit</button>
                  <button onClick={() => deleteAgent(agent)} className="text-xs text-gray-500 hover:text-red-400 px-2">Del</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
