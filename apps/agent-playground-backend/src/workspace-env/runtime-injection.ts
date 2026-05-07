import path from 'node:path';
import { parse as parseDotenv } from 'dotenv';
import type {
  CommandResult,
  ExecuteCommandOptions,
  ProcessHandle,
  SpawnProcessOptions,
} from '@mastra/core/workspace';
import type { ProvisionedWorkspace } from '../workspace-provider.js';
import { resolveWorkspaceAppPath } from './file-store.js';

const PATCHED = Symbol.for('augment.workspaceEnvInjection.patched');
const ENV_FILES = ['.env', '.env.local'] as const;

type PatchableSandbox = {
  executeCommand?: (
    command: string,
    args?: string[],
    options?: ExecuteCommandOptions,
  ) => Promise<CommandResult>;
  processes?: {
    spawn?: (command: string, options?: SpawnProcessOptions) => Promise<ProcessHandle>;
    get?: (pid: string) => Promise<ProcessHandle | undefined>;
  };
  [PATCHED]?: boolean;
};

export async function loadWorkspaceEnvForCwd(
  provisioned: Pick<ProvisionedWorkspace, 'workspace' | 'workspacePath' | 'providerKind'>,
  cwd?: string,
): Promise<Record<string, string>> {
  if (!provisioned.workspacePath || !provisioned.workspace.filesystem) return {};

  const root = normalizePathForRoot(provisioned.workspacePath, provisioned.workspacePath);
  let current: string;
  try {
    current = resolveWorkspaceAppPath(provisioned, cwd || provisioned.workspacePath);
  } catch {
    return {};
  }

  current = normalizePathForRoot(current, provisioned.workspacePath);
  const envDir = await nearestEnvDirectory(provisioned, root, current);
  return readEnvDirectory(provisioned, envDir);
}

export function installWorkspaceEnvInjection(provisioned: ProvisionedWorkspace): void {
  const sandbox = provisioned.workspace.sandbox as PatchableSandbox | undefined;
  if (!sandbox || sandbox[PATCHED]) return;
  sandbox[PATCHED] = true;

  if (sandbox.executeCommand) {
    const originalExecute = sandbox.executeCommand.bind(sandbox);
    sandbox.executeCommand = async (command, args, options = {}) => {
      const { options: nextOptions, redactions } = await optionsWithWorkspaceEnv(provisioned, options);
      const result = await originalExecute(command, args, nextOptions);
      return redactCommandResult(result, redactions);
    };
  }

  const processes = sandbox.processes;
  if (processes?.spawn) {
    const originalSpawn = processes.spawn.bind(processes);
    const originalGet = processes.get?.bind(processes);
    const handles = new Map<string, ProcessHandle>();

    processes.spawn = async (command, options = {}) => {
      const { options: nextOptions, redactions } = await optionsWithWorkspaceEnv(provisioned, options);
      const handle = await originalSpawn(command, nextOptions);
      const wrapped = redactProcessHandle(handle, redactions);
      handles.set(wrapped.pid, wrapped);
      return wrapped;
    };

    if (originalGet) {
      processes.get = async (pid: string) => {
        const existing = handles.get(pid);
        if (existing) return existing;
        const handle = await originalGet(pid);
        return handle;
      };
    }
  }
}

async function optionsWithWorkspaceEnv<TOptions extends ExecuteCommandOptions | SpawnProcessOptions>(
  provisioned: ProvisionedWorkspace,
  options: TOptions,
): Promise<{ options: TOptions; redactions: string[] }> {
  const workspaceEnv = await loadWorkspaceEnvForCwd(provisioned, options.cwd);
  const mergedEnv = {
    ...workspaceEnv,
    ...(options.env ?? {}),
  };
  const redactions = Object.keys(workspaceEnv)
    .map((key) => String(mergedEnv[key] ?? ''))
    .filter((value) => value.length > 0);
  const nextOptions = {
    ...options,
    ...(Object.keys(mergedEnv).length > 0 ? { env: mergedEnv } : {}),
    ...(options.onStdout ? { onStdout: (data: string) => options.onStdout?.(redactText(data, redactions)) } : {}),
    ...(options.onStderr ? { onStderr: (data: string) => options.onStderr?.(redactText(data, redactions)) } : {}),
  };
  return { options: nextOptions as TOptions, redactions };
}

async function nearestEnvDirectory(
  provisioned: Pick<ProvisionedWorkspace, 'workspace'>,
  root: string,
  start: string,
): Promise<string> {
  let current = start;
  while (true) {
    if (await hasAnyEnvFile(provisioned, current)) return current;
    if (current === root) return root;
    const next = dirnameForPath(current);
    if (next === current || !isInsideOrEqual(next, root)) return root;
    current = next;
  }
}

async function hasAnyEnvFile(provisioned: Pick<ProvisionedWorkspace, 'workspace'>, dir: string): Promise<boolean> {
  for (const envFile of ENV_FILES) {
    try {
      if (await provisioned.workspace.filesystem?.exists(joinPath(dir, envFile))) return true;
    } catch {
      // Ignore provider-specific stat/read errors and continue probing.
    }
  }
  return false;
}

async function readEnvDirectory(
  provisioned: Pick<ProvisionedWorkspace, 'workspace'>,
  dir: string,
): Promise<Record<string, string>> {
  const filesystem = provisioned.workspace.filesystem;
  if (!filesystem) return {};
  const env: Record<string, string> = {};
  for (const envFile of ENV_FILES) {
    const filePath = joinPath(dir, envFile);
    try {
      if (!await filesystem.exists(filePath)) continue;
      const raw = await filesystem.readFile(filePath, { encoding: 'utf8' });
      Object.assign(env, parseDotenv(Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw))));
    } catch {
      // Missing or unreadable env files should not block command execution.
    }
  }
  return env;
}

function redactCommandResult(result: CommandResult, redactions: string[]): CommandResult {
  return {
    ...result,
    stdout: redactText(result.stdout, redactions),
    stderr: redactText(result.stderr, redactions),
  };
}

function redactProcessHandle(handle: ProcessHandle, redactions: string[]): ProcessHandle {
  return {
    get pid() { return handle.pid; },
    get exitCode() { return handle.exitCode; },
    get command() { return handle.command; },
    set command(value: string | undefined) { handle.command = value; },
    get stdout() { return redactText(handle.stdout, redactions); },
    get stderr() { return redactText(handle.stderr, redactions); },
    get reader() { return handle.reader; },
    get writer() { return handle.writer; },
    kill: () => handle.kill(),
    sendStdin: (data: string) => handle.sendStdin(data),
    wait: async (options?: { onStdout?: (data: string) => void; onStderr?: (data: string) => void }) => {
      const result = await handle.wait({
        ...(options?.onStdout ? { onStdout: (data: string) => options.onStdout?.(redactText(data, redactions)) } : {}),
        ...(options?.onStderr ? { onStderr: (data: string) => options.onStderr?.(redactText(data, redactions)) } : {}),
      });
      return redactCommandResult(result, redactions);
    },
  } as ProcessHandle;
}

function redactText(text: string, redactions: string[]): string {
  let next = text;
  for (const value of redactions) {
    if (value.length < 3) continue;
    next = next.split(value).join('[REDACTED_ENV_VALUE]');
  }
  return next;
}

function normalizePathForRoot(input: string, root: string): string {
  return usesWindowsPaths(root) ? path.win32.resolve(input) : path.posix.resolve(input.replaceAll('\\', '/'));
}

function dirnameForPath(input: string): string {
  return usesWindowsPaths(input) ? path.win32.dirname(input) : path.posix.dirname(input);
}

function joinPath(dir: string, filename: string): string {
  return usesWindowsPaths(dir) ? path.win32.join(dir, filename) : path.posix.join(dir, filename);
}

function isInsideOrEqual(candidate: string, root: string): boolean {
  if (usesWindowsPaths(root)) {
    const normalizedCandidate = candidate.toLowerCase();
    const normalizedRoot = root.toLowerCase();
    return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}\\`);
  }
  return candidate === root || candidate.startsWith(`${root}/`);
}

function usesWindowsPaths(input: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(input) || input.includes('\\');
}
