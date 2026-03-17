import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const HOME = process.env.USERPROFILE || process.env.HOME || '';
const CLAUDE_DIR = path.join(HOME, '.claude');

export class ConfigManager {

  // ── CLAUDE.md files ──

  async getClaudeMdFiles(workingDirectory?: string): Promise<Array<{path: string; name: string; scope: string; content: string}>> {
    const files: Array<{path: string; name: string; scope: string; content: string}> = [];

    // User-level CLAUDE.md
    const userMd = path.join(CLAUDE_DIR, 'CLAUDE.md');
    if (fs.existsSync(userMd)) {
      files.push({ path: userMd, name: 'CLAUDE.md', scope: 'user', content: fs.readFileSync(userMd, 'utf-8') });
    }

    // Project-level
    if (workingDirectory) {
      const projectMd = path.join(workingDirectory, 'CLAUDE.md');
      if (fs.existsSync(projectMd)) {
        files.push({ path: projectMd, name: 'CLAUDE.md', scope: 'project', content: fs.readFileSync(projectMd, 'utf-8') });
      }

      const projectMd2 = path.join(workingDirectory, '.claude', 'CLAUDE.md');
      if (fs.existsSync(projectMd2)) {
        files.push({ path: projectMd2, name: '.claude/CLAUDE.md', scope: 'project', content: fs.readFileSync(projectMd2, 'utf-8') });
      }

      // Rules directory
      const rulesDir = path.join(workingDirectory, '.claude', 'rules');
      if (fs.existsSync(rulesDir)) {
        this.scanRulesDir(rulesDir, workingDirectory, files);
      }
    }

    // User rules
    const userRulesDir = path.join(CLAUDE_DIR, 'rules');
    if (fs.existsSync(userRulesDir)) {
      this.scanRulesDir(userRulesDir, HOME, files);
    }

    return files;
  }

  private scanRulesDir(dir: string, basePath: string, files: Array<{path: string; name: string; scope: string; content: string}>) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true, recursive: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          const fullPath = path.join(dir, entry.name);
          // Handle recursive entries - parentPath may exist
          const actualPath = (entry as any).parentPath ? path.join((entry as any).parentPath, entry.name) : fullPath;
          if (fs.existsSync(actualPath)) {
            const relativePath = path.relative(basePath, actualPath);
            files.push({
              path: actualPath,
              name: relativePath,
              scope: 'rules',
              content: fs.readFileSync(actualPath, 'utf-8'),
            });
          }
        }
      }
    } catch {}
  }

  saveClaudeMdFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  // ── Skills ──

  async getSkills(workingDirectory?: string): Promise<Array<{name: string; description: string; path: string; scope: string; enabled: boolean}>> {
    const skills: Array<{name: string; description: string; path: string; scope: string; enabled: boolean}> = [];

    // User skills
    const userSkillsDir = path.join(CLAUDE_DIR, 'skills');
    if (fs.existsSync(userSkillsDir)) {
      this.scanSkillsDir(userSkillsDir, 'user', skills);
    }

    // Project skills
    if (workingDirectory) {
      const projectSkillsDir = path.join(workingDirectory, '.claude', 'skills');
      if (fs.existsSync(projectSkillsDir)) {
        this.scanSkillsDir(projectSkillsDir, 'project', skills);
      }
    }

    return skills;
  }

  private scanSkillsDir(dir: string, scope: string, skills: Array<{name: string; description: string; path: string; scope: string; enabled: boolean}>) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillMd = path.join(dir, entry.name, 'SKILL.md');
          if (fs.existsSync(skillMd)) {
            const content = fs.readFileSync(skillMd, 'utf-8');
            const nameLine = content.match(/^name:\s*(.+)$/m);
            const descLine = content.match(/^description:\s*["']?(.+?)["']?\s*$/m);
            skills.push({
              name: nameLine ? nameLine[1].trim() : entry.name,
              description: descLine ? descLine[1].trim() : '',
              path: skillMd,
              scope,
              enabled: true, // all discovered skills are enabled by default
            });
          }
        }
      }
    } catch {}
  }

  // ── MCP Servers ──

  async getMcpServers(workingDirectory?: string): Promise<Array<{name: string; type: string; command?: string; args?: string[]; url?: string; env?: Record<string, string>; scope: string; enabled: boolean}>> {
    const servers: Array<any> = [];

    // Project .mcp.json
    if (workingDirectory) {
      const mcpJson = path.join(workingDirectory, '.mcp.json');
      if (fs.existsSync(mcpJson)) {
        try {
          const config = JSON.parse(fs.readFileSync(mcpJson, 'utf-8'));
          if (config.mcpServers) {
            for (const [name, cfg] of Object.entries(config.mcpServers) as any[]) {
              servers.push({
                name,
                type: cfg.type || (cfg.command ? 'stdio' : 'http'),
                command: cfg.command,
                args: cfg.args,
                url: cfg.url,
                env: cfg.env,
                scope: 'project',
                enabled: true,
              });
            }
          }
        } catch {}
      }
    }

    // User ~/.claude.json
    const userClaudeJson = path.join(HOME, '.claude.json');
    if (fs.existsSync(userClaudeJson)) {
      try {
        const config = JSON.parse(fs.readFileSync(userClaudeJson, 'utf-8'));
        if (config.mcpServers) {
          for (const [name, cfg] of Object.entries(config.mcpServers) as any[]) {
            if (!servers.find(s => s.name === name)) {
              servers.push({
                name,
                type: cfg.type || (cfg.command ? 'stdio' : 'http'),
                command: cfg.command,
                args: cfg.args,
                url: cfg.url,
                env: cfg.env,
                scope: 'user',
                enabled: true,
              });
            }
          }
        }
      } catch {}
    }

    return servers;
  }

  addMcpServer(config: {name: string; type: string; command?: string; args?: string[]; url?: string; env?: Record<string, string>; scope: string}): void {
    const filePath = config.scope === 'user'
      ? path.join(HOME, '.claude.json')
      : null; // project scope needs working directory

    // For project scope, we need to know the working directory.
    // For now, handle user scope here
    if (config.scope === 'user') {
      let existing: any = {};
      if (fs.existsSync(filePath!)) {
        try { existing = JSON.parse(fs.readFileSync(filePath!, 'utf-8')); } catch {}
      }
      if (!existing.mcpServers) existing.mcpServers = {};
      const serverConfig: any = {};
      if (config.type === 'stdio') {
        serverConfig.command = config.command;
        serverConfig.args = config.args;
      } else {
        serverConfig.type = config.type;
        serverConfig.url = config.url;
      }
      if (config.env && Object.keys(config.env).length > 0) {
        serverConfig.env = config.env;
      }
      existing.mcpServers[config.name] = serverConfig;
      fs.writeFileSync(filePath!, JSON.stringify(existing, null, 2), 'utf-8');
    }
  }

  addMcpServerToProject(workingDirectory: string, config: {name: string; type: string; command?: string; args?: string[]; url?: string; env?: Record<string, string>}): void {
    const filePath = path.join(workingDirectory, '.mcp.json');
    let existing: any = {};
    if (fs.existsSync(filePath)) {
      try { existing = JSON.parse(fs.readFileSync(filePath, 'utf-8')); } catch {}
    }
    if (!existing.mcpServers) existing.mcpServers = {};
    const serverConfig: any = {};
    if (config.type === 'stdio') {
      serverConfig.command = config.command;
      serverConfig.args = config.args;
    } else {
      serverConfig.type = config.type;
      serverConfig.url = config.url;
    }
    if (config.env && Object.keys(config.env).length > 0) {
      serverConfig.env = config.env;
    }
    existing.mcpServers[config.name] = serverConfig;
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf-8');
  }

  removeMcpServer(name: string, scope: string, workingDirectory?: string): void {
    if (scope === 'user') {
      const filePath = path.join(HOME, '.claude.json');
      if (!fs.existsSync(filePath)) return;
      try {
        const config = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (config.mcpServers) {
          delete config.mcpServers[name];
          fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
        }
      } catch {}
    } else if (scope === 'project' && workingDirectory) {
      const filePath = path.join(workingDirectory, '.mcp.json');
      if (!fs.existsSync(filePath)) return;
      try {
        const config = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (config.mcpServers) {
          delete config.mcpServers[name];
          fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
        }
      } catch {}
    }
  }

  // ── Settings JSON ──

  getClaudeSettings(scope: 'user' | 'project', workingDirectory?: string): string {
    const filePath = scope === 'user'
      ? path.join(CLAUDE_DIR, 'settings.json')
      : workingDirectory
        ? path.join(workingDirectory, '.claude', 'settings.json')
        : '';

    if (filePath && fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    return '{\n  \n}';
  }

  saveClaudeSettings(scope: 'user' | 'project', content: string, workingDirectory?: string): void {
    const filePath = scope === 'user'
      ? path.join(CLAUDE_DIR, 'settings.json')
      : workingDirectory
        ? path.join(workingDirectory, '.claude', 'settings.json')
        : '';

    if (!filePath) return;
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  // ── Generic file read/write ──

  readFile(filePath: string): string | null {
    try { return fs.readFileSync(filePath, 'utf-8'); } catch { return null; }
  }

  saveFile(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  // ── Session Memory ──

  saveSessionMemory(workingDirectory: string): string {
    // Returns the prompt to send to Claude
    return `Please create a session memory file that summarizes:
1. What was accomplished in this session
2. What is currently in progress
3. What remains to be done
4. Any important context or decisions made

Save this to a file called ".claude-session-memory.md" in the current project folder (${workingDirectory}).
Format it as a clear markdown document that another Claude instance could read to resume work.`;
  }

  getSessionMemory(workingDirectory: string): string | null {
    const memFile = path.join(workingDirectory, '.claude-session-memory.md');
    if (fs.existsSync(memFile)) {
      return fs.readFileSync(memFile, 'utf-8');
    }
    return null;
  }
}
