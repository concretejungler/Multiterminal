import { useState, useEffect } from 'react';

declare const window: Window & { api: any };

interface McpServer {
  name: string;
  type: 'stdio' | 'http' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  scope: 'project' | 'user' | 'local';
  enabled: boolean;
}

interface McpServersTabProps {
  instanceId?: string;
}

export function McpServersTab({ instanceId }: McpServersTabProps) {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);

  // Add form state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'stdio' | 'http'>('stdio');
  const [newCommand, setNewCommand] = useState('npx');
  const [newArgs, setNewArgs] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newEnv, setNewEnv] = useState('');
  const [newScope, setNewScope] = useState<'project' | 'user'>('project');

  useEffect(() => { loadServers(); }, [instanceId]);

  const loadServers = async () => {
    setLoading(true);
    try {
      const result = await window.api.getMcpServers(instanceId);
      setServers(result || []);
    } catch { setServers([]); }
    setLoading(false);
  };

  const toggleServer = async (server: McpServer) => {
    await window.api.toggleMcpServer(server.name, !server.enabled, instanceId);
    loadServers();
  };

  const removeServer = async (server: McpServer) => {
    if (!confirm(`Remove MCP server "${server.name}"?`)) return;
    await window.api.removeMcpServer(server.name, server.scope);
    loadServers();
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const config: any = { name: newName.trim(), type: newType, scope: newScope };
    if (newType === 'stdio') {
      config.command = newCommand;
      config.args = newArgs.split(/\s+/).filter(Boolean);
    } else {
      config.url = newUrl;
    }
    if (newEnv.trim()) {
      try {
        config.env = JSON.parse(newEnv);
      } catch {
        config.env = {};
      }
    }
    await window.api.addMcpServer(config);
    setShowAdd(false);
    resetForm();
    loadServers();
  };

  const resetForm = () => {
    setNewName(''); setNewType('stdio'); setNewCommand('npx'); setNewArgs(''); setNewUrl(''); setNewEnv(''); setNewScope('project');
  };

  const editServer = (server: McpServer) => {
    setEditingServer(server);
    setNewName(server.name);
    setNewType(server.type === 'http' || server.type === 'sse' ? 'http' : 'stdio');
    setNewCommand(server.command || 'npx');
    setNewArgs((server.args || []).join(' '));
    setNewUrl(server.url || '');
    setNewEnv(server.env ? JSON.stringify(server.env, null, 2) : '');
    setNewScope(server.scope === 'user' ? 'user' : 'project');
    setShowAdd(true);
  };

  const scopeColor = (scope: string) => {
    switch (scope) {
      case 'user': return 'bg-green-900/30 text-green-400';
      case 'project': return 'bg-blue-900/30 text-blue-400';
      case 'local': return 'bg-gray-800 text-gray-400';
      default: return 'bg-gray-800 text-gray-400';
    }
  };

  const typeIcon = (type: string) => type === 'stdio' ? '💻' : '🌐';

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-xs text-gray-500">{servers.length} server{servers.length !== 1 ? 's' : ''} configured</span>
        <button onClick={() => { setShowAdd(!showAdd); setEditingServer(null); resetForm(); }} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded">
          {showAdd ? 'Cancel' : '+ Add Server'}
        </button>
      </div>

      {/* Add/Edit form */}
      {showAdd && (
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-3">
          <div className="text-xs font-medium text-gray-400 uppercase">{editingServer ? 'Edit Server' : 'Add MCP Server'}</div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-400">Name</span>
              <input className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700" value={newName} onChange={e => setNewName(e.target.value)} placeholder="my-server" />
            </label>
            <label className="block">
              <span className="text-xs text-gray-400">Scope</span>
              <select className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700" value={newScope} onChange={e => setNewScope(e.target.value as any)}>
                <option value="project">Project (.mcp.json)</option>
                <option value="user">User (~/.claude.json)</option>
              </select>
            </label>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="radio" name="type" checked={newType === 'stdio'} onChange={() => setNewType('stdio')} /> stdio
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input type="radio" name="type" checked={newType === 'http'} onChange={() => setNewType('http')} /> HTTP/SSE
            </label>
          </div>
          {newType === 'stdio' ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs text-gray-400">Command</span>
                <input className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700" value={newCommand} onChange={e => setNewCommand(e.target.value)} placeholder="npx" />
              </label>
              <label className="block">
                <span className="text-xs text-gray-400">Arguments</span>
                <input className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700" value={newArgs} onChange={e => setNewArgs(e.target.value)} placeholder="-y @modelcontextprotocol/server-github" />
              </label>
            </div>
          ) : (
            <label className="block">
              <span className="text-xs text-gray-400">URL</span>
              <input className="w-full mt-1 bg-gray-800 text-gray-100 text-sm px-3 py-1.5 rounded border border-gray-700" value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://api.example.com/mcp" />
            </label>
          )}
          <label className="block">
            <span className="text-xs text-gray-400">Environment Variables (JSON, optional)</span>
            <textarea className="w-full mt-1 bg-gray-800 text-gray-100 text-sm font-mono px-3 py-1.5 rounded border border-gray-700 h-16 resize-none" value={newEnv} onChange={e => setNewEnv(e.target.value)} placeholder='{"API_KEY": "your-key"}' />
          </label>
          <button onClick={handleAdd} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded">
            {editingServer ? 'Update' : 'Add Server'}
          </button>
        </div>
      )}

      {/* Server list */}
      {loading ? (
        <div className="text-sm text-gray-500">Loading MCP servers...</div>
      ) : servers.length === 0 ? (
        <div className="text-sm text-gray-600 text-center py-8">
          No MCP servers configured. Add one above or check the Discover tab.
        </div>
      ) : (
        <div className="space-y-1">
          {servers.map(server => (
            <div key={server.name} className="flex items-center gap-3 px-3 py-2.5 bg-gray-900/50 rounded hover:bg-gray-800/50 group">
              <input type="checkbox" checked={server.enabled} onChange={() => toggleServer(server)} className="accent-blue-500" />
              <span className="text-sm">{typeIcon(server.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-200 font-medium">{server.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${scopeColor(server.scope)}`}>{server.scope}</span>
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {server.type === 'stdio' ? `${server.command} ${(server.args || []).join(' ')}` : server.url}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                <button onClick={() => editServer(server)} className="text-xs text-gray-500 hover:text-gray-300 px-2">Edit</button>
                <button onClick={() => removeServer(server)} className="text-xs text-gray-500 hover:text-red-400 px-2">Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
