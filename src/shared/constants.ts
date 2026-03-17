export const IPC = {
  PTY_CREATE: 'pty:create',
  PTY_DATA: 'pty:data',
  PTY_INPUT: 'pty:input',
  PTY_RESIZE: 'pty:resize',
  PTY_KILL: 'pty:kill',
  PTY_ERROR: 'pty:error',
  PTY_RESTART: 'pty:restart',
  PTY_STATUS: 'pty:status',
  QUEUE_SEND_NEXT: 'queue:send-next',
  NOTIFICATION_DONE: 'notification:done',
  GIT_PUSH: 'git:push',
  GIT_RESULT: 'git:result',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  CLIPBOARD_LOG: 'clipboard:log',
  CLIPBOARD_HISTORY: 'clipboard:history',
} as const;

export const DEFAULTS: import('./types').GlobalSettings = {
  defaultWorkingDirectory: '',
  soundEnabled: true,
  soundChoice: 'chime',
  soundVolume: 0.7,
  theme: 'dark',
  defaultSkipPermissions: false,
  githubDefaultBranch: 'main',
  scrollbackLines: 10000,
};

export const MAX_INSTANCES = 8;
export const WARN_INSTANCES = 6;
export const MAX_PASTE_HISTORY = 1000;
export const IDLE_DEBOUNCE_MS = 2000;
export const IDLE_SILENCE_MS = 5000;

export const PROMPT_PATTERNS = [
  /❯\s*$/m,
  /\$\s*$/m,
  />\s*$/m,
];

export const PERMISSION_PATTERNS = [
  /Allow|Deny/i,
  /\(Y\/n\)/i,
  /\[y\/N\]/i,
];

export const PLAN_PATTERNS = [
  /^[\s]*-\s*\[([ xX✓✗])\]\s*(.+)$/gm,
  /^[\s]*(\d+)\.\s+(.+)$/gm,
  /^[\s]*Step\s+(\d+)[:\s]+(.+)$/gim,
];

export const STATUS_PATTERNS = [
  /(?:Working on|Creating|Running|Implementing|Fixing|Writing|Reading|Searching)\s+(.+)/i,
];
