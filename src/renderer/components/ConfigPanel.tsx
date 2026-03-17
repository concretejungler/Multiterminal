import { useState } from 'react';
import { ClaudeMdTab } from './config/ClaudeMdTab';
import { SkillsTab } from './config/SkillsTab';
import { McpServersTab } from './config/McpServersTab';
import { SettingsTab } from './config/SettingsTab';
import { DiscoverTab } from './config/DiscoverTab';

const TABS = [
  { id: 'claudemd', label: 'CLAUDE.md', icon: '📝' },
  { id: 'skills', label: 'Skills & Plugins', icon: '⚡' },
  { id: 'mcp', label: 'MCP Servers', icon: '🔌' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
  { id: 'discover', label: 'Discover', icon: '🔍' },
] as const;

type TabId = typeof TABS[number]['id'];

interface ConfigPanelProps {
  instanceId?: string; // if provided, show per-instance config; null = global
}

export function ConfigPanel({ instanceId }: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('claudemd');

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-gray-800 bg-gray-900/50 px-2 gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Scope indicator */}
      <div className="px-4 py-2 bg-gray-900/30 border-b border-gray-800 flex items-center gap-2">
        <span className="text-xs text-gray-500">Scope:</span>
        <span className={`text-xs px-2 py-0.5 rounded ${instanceId ? 'bg-blue-900/30 text-blue-400' : 'bg-purple-900/30 text-purple-400'}`}>
          {instanceId ? 'Instance' : 'Global'}
        </span>
        {instanceId && (
          <span className="text-xs text-gray-600">Changes apply to this instance only</span>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'claudemd' && <ClaudeMdTab instanceId={instanceId} />}
        {activeTab === 'skills' && <SkillsTab instanceId={instanceId} />}
        {activeTab === 'mcp' && <McpServersTab instanceId={instanceId} />}
        {activeTab === 'settings' && <SettingsTab instanceId={instanceId} />}
        {activeTab === 'discover' && <DiscoverTab />}
      </div>
    </div>
  );
}
