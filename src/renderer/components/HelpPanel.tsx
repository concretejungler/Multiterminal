import { useState } from 'react';

interface HelpSection {
  title: string;
  icon: string;
  items: { label: string; desc: string }[];
}

const HELP_SECTIONS: HelpSection[] = [
  {
    title: 'Getting Started',
    icon: '🚀',
    items: [
      { label: 'Create an instance', desc: 'Click the + button in the tab bar. Enter a name (a folder is auto-created on your Desktop) and click Create.' },
      { label: 'Start Claude', desc: 'Click "Start Claude" to launch in normal mode, or "Skip Permissions" to run with --dangerously-skip-permissions.' },
      { label: 'Switch instances', desc: 'Click tabs to switch between Claude instances. Each keeps its own terminal state.' },
      { label: 'Close an instance', desc: 'Hover a tab and click ✕ to close it. The Claude process is killed automatically.' },
    ],
  },
  {
    title: 'Terminal',
    icon: '💻',
    items: [
      { label: 'Type directly', desc: 'Click the terminal area and type. Keystrokes go directly to Claude, just like a normal terminal.' },
      { label: 'Input bar', desc: 'The bottom input bar is an alternative way to send commands. Press Enter to send, Ctrl+Enter to add to the queue.' },
      { label: 'Copy/Paste', desc: 'Select text to copy (Ctrl+C). Paste with Ctrl+V. All pastes are logged in Paste History.' },
      { label: 'Scroll', desc: 'Scroll up to see previous output. 10,000 lines of scrollback.' },
    ],
  },
  {
    title: 'Command Queue',
    icon: '📋',
    items: [
      { label: 'Queue commands', desc: 'Press Ctrl+Enter in the input bar to add a command to the queue instead of sending immediately.' },
      { label: 'Auto-send', desc: 'When Claude finishes (goes idle), the next queued command is sent automatically.' },
      { label: 'Manage queue', desc: 'View, reorder, or remove queued commands in the Queue section below the terminal.' },
      { label: 'Queue git push', desc: 'Click the 📤 icon in the queue to add a "Push to GitHub" action.' },
    ],
  },
  {
    title: 'Status & Progress',
    icon: '📊',
    items: [
      { label: 'Status bar', desc: 'Each instance shows its status: working (spinner), idle (checkmark), waiting for input (warning), or error.' },
      { label: 'Progress tracking', desc: 'When Claude creates todo lists, progress is auto-parsed and shown as a percentage.' },
      { label: 'Plan checklist', desc: 'Claude\'s task lists appear as a checklist below the terminal. Collapsible.' },
      { label: 'Rename instance', desc: 'Double-click the instance name in the status bar to rename it.' },
    ],
  },
  {
    title: 'Configuration (⚙)',
    icon: '⚙',
    items: [
      { label: 'CLAUDE.md tab', desc: 'View and edit CLAUDE.md files (project and user level). Create new rules in .claude/rules/.' },
      { label: 'Subagents tab', desc: 'Manage custom subagents. Create from templates (Code Reviewer, Test Runner, etc.) or from scratch. Launch as new tabs.' },
      { label: 'Skills tab', desc: 'View all discovered skills. Toggle enable/disable. Create new skills with SKILL.md files.' },
      { label: 'MCP Servers tab', desc: 'List, add, edit, remove MCP servers. Supports stdio and HTTP types. Project or user scope.' },
      { label: 'Settings tab', desc: 'Direct JSON editor for .claude/settings.json (project) and ~/.claude/settings.json (user).' },
      { label: 'Discover tab', desc: 'Links to MCP registries, popular servers with one-click copy-install, and skill/plugin sources.' },
    ],
  },
  {
    title: 'Subagents',
    icon: '🤖',
    items: [
      { label: 'Built-in agents', desc: 'Explore (fast search), Plan (read-only research), General (full access). Click to launch as a new tab.' },
      { label: 'Custom agents', desc: 'Create agents with custom system prompts, tool restrictions, and model selection.' },
      { label: 'Templates', desc: '5 pre-built templates: Code Reviewer, Test Runner, Security Auditor, Doc Writer, Refactoring Assistant.' },
      { label: 'Edit agents', desc: 'Click Edit on any agent to modify its .md file directly.' },
    ],
  },
  {
    title: '/btw Quick Ask (💬)',
    icon: '💬',
    items: [
      { label: 'What is /btw?', desc: 'A quick side-question that doesn\'t interrupt Claude\'s work or add to conversation history.' },
      { label: 'How to use', desc: 'Click the 💬 button in the top bar. Type your question and press Enter.' },
      { label: 'When to use', desc: 'Quick fact-checks, clarifications, or questions about what Claude already read. Low cost, no interruption.' },
    ],
  },
  {
    title: 'Remote Control (📡)',
    icon: '📡',
    items: [
      { label: 'What is it?', desc: 'Access your Claude session from claude.ai/code or the Claude mobile app. Session stays local on your machine.' },
      { label: 'Enable', desc: 'Click the 📡 button in the top bar. A URL and QR code appear in the terminal.' },
      { label: 'Connect', desc: 'Open the session URL in your browser or scan the QR code with the Claude iOS/Android app.' },
      { label: 'Requirements', desc: 'Signed in via /login (not API key), Pro/Max/Team/Enterprise plan, Claude Code v2.1.51+.' },
    ],
  },
  {
    title: 'Session Memory (💾)',
    icon: '💾',
    items: [
      { label: 'Save session', desc: 'Click 💾 in the status bar. Claude creates a .claude-session-memory.md file summarizing the session.' },
      { label: 'Resume session', desc: 'When starting a new instance in the same directory, a "Resume" banner appears with the saved context.' },
      { label: 'What is saved', desc: 'What was done, what\'s in progress, what\'s left, and important decisions. Saved to the project folder.' },
    ],
  },
  {
    title: 'Git Push (📤)',
    icon: '📤',
    items: [
      { label: 'Push to GitHub', desc: 'Click 📤 in the top bar. Select branch, write commit message, and push.' },
      { label: 'Auto-detect', desc: 'Automatically detects the git repo, current branch, and staged/unstaged changes.' },
      { label: 'Queue integration', desc: 'Add a git push to the command queue — it runs with default settings when Claude goes idle.' },
    ],
  },
  {
    title: 'Paste History (📋)',
    icon: '📋',
    items: [
      { label: 'View history', desc: 'Click 📋 in the top bar or press Ctrl+Shift+V to open paste history.' },
      { label: 'Search', desc: 'Type in the search bar to filter past pastes.' },
      { label: 'Re-paste', desc: 'Click any entry to paste it into the active terminal.' },
      { label: 'Persistence', desc: 'History is saved across sessions. Up to 1,000 entries.' },
    ],
  },
  {
    title: 'Sound Notifications',
    icon: '🔔',
    items: [
      { label: 'When Claude finishes', desc: 'A sound plays when any instance goes idle (finishes working). Also shows a Windows notification.' },
      { label: 'Per-instance mute', desc: 'Click the bell icon in any instance\'s status bar to mute/unmute.' },
      { label: 'Sound settings', desc: 'Configure sound choice (chime/bell/ding) and volume in the ⚙ settings.' },
    ],
  },
  {
    title: 'Keyboard Shortcuts',
    icon: '⌨',
    items: [
      { label: 'Ctrl+Enter', desc: 'Add command to queue (in input bar)' },
      { label: 'Ctrl+Shift+V', desc: 'Toggle paste history panel' },
      { label: 'Ctrl+C', desc: 'Copy selected text from terminal' },
      { label: 'Ctrl+V', desc: 'Paste into terminal' },
    ],
  },
];

export function HelpPanel() {
  const [open, setOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('Getting Started');

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-8 h-8 text-gray-500 hover:text-gray-200 hover:bg-gray-800 rounded flex items-center justify-center text-sm"
        title="Help — feature guide"
      >
        ?
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setOpen(false)}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-lg font-medium text-gray-100">Multiterminal Help</h2>
            <p className="text-xs text-gray-500 mt-0.5">Manage multiple Claude Code instances in one app</p>
          </div>
          <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-200 text-lg">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {HELP_SECTIONS.map(section => (
            <div key={section.title} className="border border-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === section.title ? null : section.title)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 text-left"
              >
                <span>{section.icon}</span>
                <span className="text-sm font-medium text-gray-200 flex-1">{section.title}</span>
                <span className="text-xs text-gray-600">{expandedSection === section.title ? '▼' : '▶'}</span>
              </button>
              {expandedSection === section.title && (
                <div className="px-4 pb-3 space-y-2">
                  {section.items.map(item => (
                    <div key={item.label} className="pl-8">
                      <span className="text-xs font-medium text-gray-300">{item.label}</span>
                      <span className="text-xs text-gray-500"> — {item.desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-800 text-center">
          <p className="text-[10px] text-gray-600">Multiterminal v1.0.0 — Built with Electron, React, xterm.js</p>
        </div>
      </div>
    </div>
  );
}
