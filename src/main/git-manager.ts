import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

interface GitPushConfig {
  workingDirectory: string;
  branch: string;
  message: string;
}

interface GitStatus {
  branch: string;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export class GitManager {
  private async git(args: string[], cwd: string): Promise<string> {
    try {
      const { stdout } = await execFileAsync('git', args, { cwd, timeout: 30000 });
      return stdout.trim();
    } catch (err: any) {
      throw new Error(err.stderr?.trim() || err.message);
    }
  }

  async getStatus(workingDirectory: string): Promise<GitStatus> {
    const branch = await this.git(['branch', '--show-current'], workingDirectory);
    const status = await this.git(['status', '--porcelain'], workingDirectory);
    const lines = status.split('\n').filter(Boolean);
    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];
    for (const line of lines) {
      const indexStatus = line[0];
      const workStatus = line[1];
      const file = line.slice(3);
      if (indexStatus === '?') untracked.push(file);
      else if (indexStatus !== ' ') staged.push(file);
      if (workStatus !== ' ' && workStatus !== '?') unstaged.push(file);
    }
    return { branch, staged, unstaged, untracked };
  }

  async getBranches(workingDirectory: string): Promise<string[]> {
    const output = await this.git(['branch', '--list', '--format=%(refname:short)'], workingDirectory);
    return output.split('\n').filter(Boolean);
  }

  async commitAndPush(config: GitPushConfig): Promise<void> {
    const { workingDirectory, branch, message } = config;
    await this.git(['add', '-A'], workingDirectory);
    try {
      await this.git(['diff', '--cached', '--quiet'], workingDirectory);
    } catch {
      await this.git(['commit', '-m', message], workingDirectory);
    }
    await this.git(['push', 'origin', branch], workingDirectory);
  }

  async isGitRepo(workingDirectory: string): Promise<boolean> {
    try {
      await this.git(['rev-parse', '--git-dir'], workingDirectory);
      return true;
    } catch {
      return false;
    }
  }
}
