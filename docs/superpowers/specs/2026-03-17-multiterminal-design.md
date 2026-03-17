# Multiterminal — Design Spec

> A desktop app for managing multiple Claude Code terminal instances in one window.

## Overview

Multiterminal is an Electron desktop application that lets users run multiple Claude Code CLI sessions simultaneously. It provides a tabbed interface with optional split-pane views, command queuing, plan tracking, sound notifications, clipboard history, and centralized skill/MCP configuration.

## Goals

1. Run N Claude Code instances in a single window with tabs
2. Drag tabs to split into up to 4 resizable panes
3. Track what each instance is doing (status, progress %, plan checklist)
4. Queue commands per instance — auto-send when idle
5. Sound + system notification when an instance finishes
6. Centralized skill/MCP toggles (global + per-instance overrides)
7. Workflow presets for debugging, security auditing, E2E testing
8. One-click push to GitHub
9. Full copy/paste with searchable paste history

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Shell | Electron 33+ | Native process mgmt, system tray, OS notifications |
| UI | React 19 + Tailwind CSS 4 | Fast iteration, utility-first styling |
| Terminal | xterm.js 5 + xterm-addon-fit + xterm-addon-web-links | Standard terminal emulator for the web |
| PTY | node-pty | Spawn real pseudo-terminals from Electron main process |
| State | Zustand | Minimal boilerplate, works well with React |
| Persistence | electron-store | JSON-based settings/history storage |
| Build | Vite + electron-builder | Fast HMR in dev, cross-platform packaging |
| IPC | Electron contextBridge + ipcRenderer/ipcMain | Secure communication between renderer and main |

## Architecture

### Process Model

```
Electron Main Process
├── WindowManager          — manages the single BrowserWindow
├── PtyManager             — spawns/kills node-pty instances per Claude session
├── QueueManager           — watches PTY output for idle, sends next queued command
├── NotificationManager    — plays sounds, fires OS toasts
├── GitManager             — runs git commands for push-to-github
├── SettingsStore          — reads/writes electron-store (global + per-instance)
└── ClipboardHistoryStore  — logs paste events with timestamps

Electron Renderer Process (React)
├── AppShell               — top-level layout, tab bar, settings sidebar
├── TabBar                 — tabs with status icons, drag-to-split
├── SplitPaneContainer     — manages pane layout (1–4 panes)
├── TerminalPane           — single Claude instance view
│   ├── StatusBar          — current task, progress %, notification toggle
│   ├── TerminalView       — xterm.js instance connected to PTY via IPC
│   ├── PlanChecklist      — parsed plan items with checkbox states
│   ├── CommandQueue       — ordered list of queued commands, drag to reorder
│   └── InputBar           — text input + Send + Skip Permissions button
├── SettingsSidebar        — global settings, skill/MCP toggles, presets
├── ClipboardHistory       — searchable paste log
└── GitPushDialog          — branch select, commit message, push action
```

### IPC Channels

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `pty:create` | renderer → main | Spawn new Claude instance |
| `pty:data` | main → renderer | Terminal output stream |
| `pty:input` | renderer → main | User keystrokes / queued commands |
| `pty:resize` | renderer → main | Terminal resize events |
| `pty:kill` | renderer → main | Kill Claude instance |
| `pty:status` | main → renderer | Parsed status updates (task, progress) |
| `queue:send-next` | main → renderer | Notify that next queued command was sent |
| `notification:done` | main → renderer | Instance finished, sound played |
| `git:push` | renderer → main | Execute git push workflow |
| `git:result` | main → renderer | Push success/failure |
| `settings:get` | renderer → main | Read settings |
| `settings:set` | renderer → main | Write settings |
| `clipboard:log` | renderer → main | Log a paste event |
| `clipboard:history` | main → renderer | Return paste history |

## App Shell & Layout

### Default State

Single tab visible, full-width terminal pane. Tab bar across the top with:
- Instance tabs showing name + status icon (⟳ working, ✓ idle, ⚠ error)
- [+] button to create new instance
- [⚙] button to open settings sidebar

### Split Mode

- Drag a tab toward the left/right/top/bottom edge of the terminal area
- Drop zones highlight showing where the pane will appear
- Supports up to 4 panes in arbitrary arrangements (horizontal, vertical, grid)
- Pane dividers are draggable to resize
- Double-click a tab or pane header to maximize back to single view
- Pane minimum size: 300px width, 200px height

### Small Pane Behavior

When a pane is below 500px wide:
- Plan checklist and command queue collapse into icon buttons in the status bar
- Click to expand as floating panels over the terminal
- Input bar remains always visible

## Terminal Pane (per instance)

### Status Bar

Top of each pane. Shows:
- Current task description (parsed from Claude output)
- Progress bar with percentage
- Bell icon to toggle sound for this instance
- Instance name (editable on double-click)

**Progress parsing:** Monitor Claude's terminal output for patterns like:
- Task/todo lists → count completed/total for percentage
- "Working on...", "Creating...", "Running..." → extract task description
- Idle detection: prompt returns with no pending output for 3+ seconds

### Terminal View

- xterm.js with fit addon (auto-resizes to pane)
- web-links addon (clickable URLs)
- Scrollback buffer: 10,000 lines (configurable)
- Copy: select text + Ctrl+C (or right-click → Copy)
- Paste: Ctrl+V (or right-click → Paste) — each paste logged to clipboard history

### Plan Checklist

- Parsed from Claude's output when it creates plans, todos, or checklists
- Regex patterns match common formats: `- [ ]`, `- [x]`, numbered steps, "Step N:"
- Read-only display (reflects Claude's progress, not user-editable)
- Collapsible panel, default expanded

### Command Queue

- List of commands to auto-send when Claude becomes idle
- Add via the [+ Add command] button or by typing in input bar and pressing Ctrl+Enter (vs Enter to send immediately)
- Drag to reorder
- Click X to remove
- Shows "Sending..." state when the top command is dispatched
- Queue persists across app restarts (saved to electron-store)

### Input Bar

- Text input field at bottom of pane
- Enter: send immediately to the active Claude instance
- Ctrl+Enter: add to command queue instead
- [Send] button: same as Enter
- [▶ Skip Permissions] button: visible only before an instance is started. Starts Claude with `--dangerously-skip-permissions` flag

## Settings Sidebar

Slides in from the right when ⚙ is clicked. Three sections:

### Global Settings

- **Working directory:** default path for new instances
- **Sound:** on/off, volume slider, sound choice (chime, bell, ding)
- **Theme:** dark (default) / light
- **Permissions:** default to normal or skip-permissions for new instances
- **GitHub:** repo URL, default branch
- **Scrollback:** buffer size (default 10,000)

### Skills & MCP Configuration

Two sub-panels: Skills and MCP Servers.

**Global defaults:**
- Toggle-all switch at the top
- Individual toggles for each skill and MCP server
- Skills and MCP servers are discovered by reading Claude Code's configuration

**Per-instance overrides:**
- Dropdown to select an instance
- "Use global defaults" checkbox (default: checked)
- When unchecked, shows the same toggles, initialized from global but independently editable
- Changes take effect on the next command sent to that instance (passed as CLI flags or config)

### Workflow Presets

Pre-configured profiles that set skill/MCP toggles and optionally queue commands:

**Debugging:**
- Enables: systematic-debugging, code-review skills
- Queues: (none by default, user adds their debug commands)

**Security Audit:**
- Enables: security-related skills
- Queues: "review this codebase for security vulnerabilities"

**E2E Testing:**
- Enables: test-driven-development, verification skills
- Queues: "run all end-to-end tests and report results"

Presets are one-click apply. Users can also create custom presets.

## Clipboard & Paste History

### Paste Logging

Every paste action into any terminal instance is logged:
- Timestamp
- Pasted text content (truncated at 500 chars for display, full text stored)
- Which instance it was pasted into

### History Panel

- Opened via Ctrl+Shift+V or button in top bar
- Searchable text field at top
- Chronological list of paste entries
- Click an entry to paste it into the currently active terminal
- History persists across sessions (stored in electron-store)
- Max 1,000 entries, oldest pruned automatically

## Git Push Integration

### Push Button

Located in top bar. When clicked, opens GitPushDialog:

1. Auto-detects current branch and repo from the active instance's working directory
2. Shows staged/unstaged changes summary
3. Branch selector dropdown
4. Commit message input (auto-generated suggestion based on recent changes)
5. [Commit & Push] button
6. Shows progress, then success/failure toast

### Queue Integration

"Push to GitHub" can also be added as a queue command in any instance — it will run the git workflow when the instance goes idle.

## Sound & Notifications

### Sounds

- Default: subtle chime when an instance goes idle after working
- Configurable: chime / bell / ding / custom file
- Volume slider in global settings
- Per-instance mute toggle (bell icon in status bar)
- Global mute button in top bar

### System Notifications

- Windows toast notification when an instance finishes
- Shows: instance name + summary of what was completed
- Clicking the notification focuses the app and switches to that tab/pane

## Data Storage

All persistence via electron-store:

```
~/.multiterminal/
├── settings.json          — global settings, theme, sounds, git config
├── instances.json         — saved instance configs, queues, per-instance overrides
├── skills-mcp.json        — skill/MCP toggle states (global + per-instance)
├── presets.json           — workflow presets (built-in + custom)
├── clipboard-history.json — paste history entries
└── window-state.json      — window size, position, pane layout
```

## File Structure

```
multiterminal/
├── package.json
├── electron-builder.yml
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── src/
│   ├── main/                      — Electron main process
│   │   ├── index.ts               — app entry, window creation
│   │   ├── pty-manager.ts         — spawn/manage node-pty instances
│   │   ├── queue-manager.ts       — command queue logic, idle detection
│   │   ├── notification-manager.ts — sounds + OS notifications
│   │   ├── git-manager.ts         — git operations
│   │   ├── settings-store.ts      — electron-store wrapper
│   │   ├── clipboard-store.ts     — paste history storage
│   │   ├── ipc-handlers.ts        — all IPC channel handlers
│   │   └── preload.ts             — contextBridge API exposure
│   ├── renderer/                  — React renderer process
│   │   ├── index.html
│   │   ├── main.tsx               — React entry
│   │   ├── App.tsx                — root component
│   │   ├── store/                 — Zustand stores
│   │   │   ├── instances.ts       — instance state (terminals, queues, status)
│   │   │   ├── settings.ts        — settings state
│   │   │   ├── clipboard.ts       — clipboard history state
│   │   │   └── layout.ts          — pane layout state
│   │   ├── components/
│   │   │   ├── AppShell.tsx        — top-level layout
│   │   │   ├── TabBar.tsx          — tab bar with drag-to-split
│   │   │   ├── SplitPaneContainer.tsx — pane layout manager
│   │   │   ├── TerminalPane.tsx    — single instance view
│   │   │   ├── StatusBar.tsx       — status + progress
│   │   │   ├── TerminalView.tsx    — xterm.js wrapper
│   │   │   ├── PlanChecklist.tsx   — parsed plan display
│   │   │   ├── CommandQueue.tsx    — queued commands list
│   │   │   ├── InputBar.tsx        — command input
│   │   │   ├── SettingsSidebar.tsx  — settings panel
│   │   │   ├── SkillsMcpPanel.tsx  — skill/MCP toggles
│   │   │   ├── WorkflowPresets.tsx — preset buttons
│   │   │   ├── ClipboardHistory.tsx — paste history panel
│   │   │   └── GitPushDialog.tsx   — git push modal
│   │   └── hooks/
│   │       ├── useTerminal.ts      — xterm.js lifecycle
│   │       ├── usePty.ts           — IPC communication with PTY
│   │       ├── useIdleDetection.ts — detect when Claude is idle
│   │       └── useStatusParser.ts  — parse Claude output for status
│   └── shared/                    — types shared between main/renderer
│       ├── types.ts               — TypeScript interfaces
│       └── constants.ts           — IPC channel names, defaults
├── assets/
│   └── sounds/
│       ├── chime.mp3
│       ├── bell.mp3
│       └── ding.mp3
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-03-17-multiterminal-design.md
```

## Non-Goals (v1)

- No remote/cloud terminal support — local only
- No collaboration/sharing between users
- No AI-powered auto-planning — just displays what Claude reports
- No plugin/extension system — built-in features only
- No mobile support
