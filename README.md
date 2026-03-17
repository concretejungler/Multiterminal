# Multiterminal

> Manage multiple Claude Code terminal instances in one desktop app.

![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Electron](https://img.shields.io/badge/electron-33%2B-47848F)
![License](https://img.shields.io/badge/license-MIT-green)

## Overview

Multiterminal is an Electron desktop application that lets you run multiple Claude Code CLI sessions simultaneously in a single window. Switch between instances with tabs, queue commands, track progress, manage configuration, and more.

## Features

### Core
- **Tabbed Terminal Interface** — Run up to 8 Claude Code instances with tab switching
- **Real Terminal Experience** — Full xterm.js terminal with copy/paste, scrollback, and clickable links
- **Auto-Start Claude** — Each instance spawns a system shell and auto-launches Claude Code

### Command Queue
- **Queue Commands** — Press Ctrl+Enter to queue commands that auto-send when Claude finishes
- **Drag to Reorder** — Rearrange queued commands
- **Queue Git Push** — Add push-to-GitHub as a queue action

### Status & Progress
- **Live Status Tracking** — See what each instance is doing (working, idle, waiting, error)
- **Progress Percentage** — Auto-parsed from Claude's todo lists
- **Plan Checklist** — Claude's task lists rendered as a collapsible checklist

### Configuration Panel (6 tabs)
- **CLAUDE.md** — View/edit project and user CLAUDE.md files, manage .claude/rules/
- **Subagents** — Create, edit, and launch custom subagents with templates
- **Skills** — Browse and manage Claude Code skills and plugins
- **MCP Servers** — Add, remove, and configure MCP servers (stdio and HTTP)
- **Settings** — Direct JSON editor for Claude Code settings files
- **Discover** — Browse MCP registries, popular servers, and skill sources

### Subagent Management
- **Built-in Agents** — Launch Explore, Plan, or General-Purpose agents as new tabs
- **Custom Agents** — Create with custom prompts, tools, and model selection
- **5 Templates** — Code Reviewer, Test Runner, Security Auditor, Doc Writer, Refactoring Assistant
- **Inline Editor** — Edit agent .md files directly in the app

### /btw Quick Ask
- **Side Questions** — Ask Claude quick questions without interrupting its work
- **No History Pollution** — Questions are ephemeral, never saved to conversation
- **Low Cost** — Reuses existing prompt cache

### Remote Control
- **Access from Anywhere** — Connect to your local Claude session from claude.ai/code or the Claude mobile app
- **Session Stays Local** — Your filesystem, tools, and configuration remain on your machine
- **One-Click Enable** — Click the 📡 button to start Remote Control

### Session Memory
- **Save Session State** — Click 💾 to have Claude create a summary of the current session
- **Resume Later** — When restarting in the same directory, offers to resume with saved context
- **Project-Level Storage** — Memory saved as .claude-session-memory.md in the project folder

### Git Integration
- **Push to GitHub** — One-click commit and push with branch selection
- **Auto-Detect** — Detects repo, branch, staged/unstaged changes
- **Error Handling** — Clear error messages for conflicts, auth issues, missing repos

### Clipboard & Notifications
- **Paste History** — Searchable log of all paste actions (Ctrl+Shift+V)
- **Sound Notifications** — Chime/bell/ding when Claude finishes, configurable volume
- **System Notifications** — Windows toast notifications with click-to-focus

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Claude Code CLI](https://claude.ai/download) installed and on PATH
- Windows 10/11
- Visual Studio Build Tools (for node-pty native compilation)

### Setup
```bash
git clone https://github.com/concretejungler/Multiterminal.git
cd Multiterminal
npm install
```

### Development
```bash
# Terminal 1: Start Vite dev server + TypeScript watcher
npm run dev

# Terminal 2: Start Electron (waits for Vite)
npm run dev:electron
```

### Build
```bash
# Build for production
npm run build

# Package as Windows installer
npm run package
```

## Usage

### Quick Start
1. Launch the app
2. Click **+ New Claude Instance**
3. Enter a name (folder auto-created on Desktop)
4. Click **Create** → **Start Claude** or **Skip Permissions**
5. Start chatting with Claude in the terminal

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send command to Claude |
| `Ctrl+Enter` | Add command to queue |
| `Ctrl+Shift+V` | Toggle paste history |
| `Ctrl+C` | Copy selected terminal text |
| `Ctrl+V` | Paste into terminal |
| `Escape` | Close dialogs/panels |

### Top Bar Buttons

| Button | Function |
|--------|----------|
| `+` | New Claude instance |
| `⚙` | Open configuration panel |
| `📋` | Paste history |
| `💬` | /btw quick ask |
| `📤` | Push to GitHub |
| `📡` | Remote Control |
| `?` | Help guide |

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Shell | Electron 33+ |
| UI | React 19 + Tailwind CSS 4 |
| Terminal | xterm.js 5 |
| PTY | node-pty |
| State | Zustand |
| Persistence | electron-store |
| Build | Vite + electron-builder |

## Project Structure

```
src/
├── main/                    # Electron main process
│   ├── index.ts             # App entry, window creation, debug logger
│   ├── pty-manager.ts       # PTY spawn/kill, status parsing, idle detection
│   ├── queue-manager.ts     # Command queue, auto-dispatch on idle
│   ├── notification-manager.ts  # Sound + OS notifications
│   ├── git-manager.ts       # Git operations (status, commit, push)
│   ├── config-manager.ts    # CLAUDE.md, skills, MCP, settings file management
│   ├── settings-store.ts    # App settings persistence
│   ├── clipboard-store.ts   # Paste history storage
│   ├── ipc-handlers.ts      # All IPC channel handlers
│   └── preload.ts           # contextBridge API
├── renderer/                # React renderer
│   ├── components/          # UI components
│   │   ├── AppShell.tsx     # Main layout
│   │   ├── TabBar.tsx       # Tab strip
│   │   ├── TerminalPane.tsx # Instance view
│   │   ├── TerminalView.tsx # xterm.js wrapper
│   │   ├── StatusBar.tsx    # Progress + status
│   │   ├── ConfigPanel.tsx  # Configuration tabs
│   │   ├── BtwBar.tsx       # /btw quick ask
│   │   ├── HelpPanel.tsx    # Feature guide
│   │   └── config/          # Config tab components
│   ├── store/               # Zustand stores
│   └── hooks/               # React hooks
└── shared/                  # Shared types + constants
```

## Configuration

Multiterminal reads and writes Claude Code's native configuration files:

| File | Purpose |
|------|---------|
| `~/.claude/settings.json` | User-level Claude settings |
| `.claude/settings.json` | Project-level Claude settings |
| `~/.claude/CLAUDE.md` | User-level instructions |
| `CLAUDE.md` | Project-level instructions |
| `.claude/agents/*.md` | Custom subagent definitions |
| `.claude/skills/*/SKILL.md` | Custom skill definitions |
| `.mcp.json` | Project MCP servers |
| `~/.claude.json` | User MCP servers |

## License

MIT
