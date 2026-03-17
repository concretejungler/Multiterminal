export interface Instance {
  id: string;
  name: string;
  workingDirectory: string;
  skipPermissions: boolean;
  status: 'idle' | 'working' | 'waiting-for-input' | 'error' | 'stopped';
  taskDescription: string;
  progressPercent: number | null;
  planItems: PlanItem[];
  queue: QueueItem[];
  soundEnabled: boolean;
}

export interface PlanItem {
  text: string;
  completed: boolean;
}

export interface QueueItem {
  id: string;
  type: 'command' | 'git-push';
  command?: string;
}

export interface GlobalSettings {
  defaultWorkingDirectory: string;
  soundEnabled: boolean;
  soundChoice: 'chime' | 'bell' | 'ding';
  soundVolume: number;
  theme: 'dark' | 'light';
  defaultSkipPermissions: boolean;
  githubDefaultBranch: string;
  scrollbackLines: number;
}

export interface SkillsMcpConfig {
  globalSkills: Record<string, boolean>;
  globalMcp: Record<string, boolean>;
  perInstance: Record<string, {
    useGlobalDefaults: boolean;
    skills: Record<string, boolean>;
    mcp: Record<string, boolean>;
  }>;
}

export interface PasteEntry {
  id: string;
  timestamp: number;
  text: string;
  instanceId: string;
  instanceName: string;
}

export interface WindowState {
  width: number;
  height: number;
  x: number;
  y: number;
  isMaximized: boolean;
}
