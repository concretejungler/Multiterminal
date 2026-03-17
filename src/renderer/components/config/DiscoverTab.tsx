export function DiscoverTab() {
  const registries = [
    { name: 'Official MCP Registry', url: 'https://registry.modelcontextprotocol.io/', desc: 'Official directory of MCP servers' },
    { name: 'PulseMCP', url: 'https://www.pulsemcp.com/servers', desc: '11,000+ MCP servers, updated daily' },
    { name: 'Glama', url: 'https://glama.ai/mcp/servers', desc: '14,000+ MCP servers directory' },
    { name: 'MCP.so', url: 'https://mcp.so/', desc: '7,600+ servers with newsletter' },
  ];

  const popularServers = [
    { name: 'GitHub', pkg: '@modelcontextprotocol/server-github', desc: 'Repo operations, PRs, issues' },
    { name: 'Filesystem', pkg: '@modelcontextprotocol/server-filesystem', desc: 'Read/write local files' },
    { name: 'PostgreSQL', pkg: '@modelcontextprotocol/server-postgres', desc: 'Query databases' },
    { name: 'Brave Search', pkg: '@modelcontextprotocol/server-brave-search', desc: 'Web search' },
    { name: 'Memory', pkg: '@modelcontextprotocol/server-memory', desc: 'Persistent knowledge graph' },
    { name: 'Sequential Thinking', pkg: '@modelcontextprotocol/server-sequential-thinking', desc: 'Structured reasoning' },
    { name: 'Playwright', pkg: '@anthropic/mcp-server-playwright', desc: 'Browser automation' },
    { name: 'Git', pkg: '@modelcontextprotocol/server-git', desc: 'Git repo operations' },
    { name: 'Slack', pkg: '@modelcontextprotocol/server-slack', desc: 'Slack messaging' },
    { name: 'SQLite', pkg: '@modelcontextprotocol/server-sqlite', desc: 'Local database' },
    { name: 'Fetch', pkg: '@modelcontextprotocol/server-fetch', desc: 'HTTP requests' },
    { name: 'Context7', pkg: 'context7', desc: 'Live documentation fetching' },
  ];

  const skillSources = [
    { name: 'Anthropic Official Plugins', url: 'https://github.com/anthropics/claude-plugins-official', desc: 'Official Claude Code plugins' },
    { name: 'Awesome MCP Servers', url: 'https://github.com/punkpeye/awesome-mcp-servers', desc: 'Community curated list' },
    { name: 'Claude Skills Collection', url: 'https://github.com/alirezarezvani/claude-skills', desc: '192+ community skills' },
    { name: 'PolySkill', url: 'https://polyskill.ai/', desc: 'Agent skills marketplace' },
  ];

  const copyInstallCmd = (pkg: string) => {
    navigator.clipboard.writeText(`claude mcp add ${pkg.split('/').pop()} -- npx -y ${pkg}`);
  };

  return (
    <div className="p-4 space-y-6 overflow-y-auto">
      {/* Registries */}
      <div>
        <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">MCP Server Registries</h3>
        <div className="grid grid-cols-2 gap-2">
          {registries.map(r => (
            <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer"
              className="flex flex-col p-3 bg-gray-900/50 rounded hover:bg-gray-800/50 border border-gray-800 hover:border-gray-700">
              <span className="text-sm text-blue-400">{r.name} ↗</span>
              <span className="text-xs text-gray-500 mt-0.5">{r.desc}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Popular servers */}
      <div>
        <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">Popular MCP Servers</h3>
        <div className="space-y-1">
          {popularServers.map(s => (
            <div key={s.pkg} className="flex items-center gap-3 px-3 py-2 bg-gray-900/50 rounded hover:bg-gray-800/50 group">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-200">{s.name}</div>
                <div className="text-xs text-gray-500">{s.desc}</div>
              </div>
              <code className="text-[10px] text-gray-600 truncate max-w-[200px]">{s.pkg}</code>
              <button
                onClick={() => copyInstallCmd(s.pkg)}
                className="text-xs text-gray-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 px-2 whitespace-nowrap"
                title="Copy install command"
              >
                📋 Copy cmd
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Skill sources */}
      <div>
        <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">Skills & Plugin Sources</h3>
        <div className="grid grid-cols-2 gap-2">
          {skillSources.map(s => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer"
              className="flex flex-col p-3 bg-gray-900/50 rounded hover:bg-gray-800/50 border border-gray-800 hover:border-gray-700">
              <span className="text-sm text-blue-400">{s.name} ↗</span>
              <span className="text-xs text-gray-500 mt-0.5">{s.desc}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
