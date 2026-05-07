import path from 'node:path';
import type { Workspace } from '@mastra/core/workspace';
import type { ProvisionedWorkspace } from '../workspace-provider.js';

export type WorkspaceEnvFile = '.env' | '.env.local';

export interface WorkspaceEnvExpectedVar {
  name: string;
  required: boolean;
  secret: boolean;
  description?: string;
  envFile?: WorkspaceEnvFile;
}

export interface WorkspaceEnvValue {
  name: string;
  value: string;
  secret: boolean;
  envFile: WorkspaceEnvFile;
  description?: string;
}

export interface WorkspaceEnvStatusVar {
  name: string;
  required: boolean;
  secret: boolean;
  hasValue: boolean;
  envFile: WorkspaceEnvFile;
  source: 'recipe' | 'user' | 'env-file';
  description?: string;
}

export interface WorkspaceEnvStatus {
  appPath: string;
  vars: WorkspaceEnvStatusVar[];
}

const VALID_ENV_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;
const ENV_FILES: WorkspaceEnvFile[] = ['.env.local', '.env'];

export function validateEnvKeyName(name: string): void {
  if (!VALID_ENV_KEY.test(name)) {
    throw new Error(`Invalid environment variable name: ${name}`);
  }
}

export function resolveWorkspaceAppPath(
  provisioned: Pick<ProvisionedWorkspace, 'workspacePath' | 'providerKind'>,
  appPath: string,
): string {
  const workspaceRoot = provisioned.workspacePath ?? (provisioned.providerKind === 'sandbox' ? '/workspace' : undefined);
  if (!workspaceRoot) throw new Error('Cannot determine workspace root for environment file operations.');

  if (usesWindowsPaths(workspaceRoot)) {
    const root = path.win32.resolve(workspaceRoot);
    const resolved = path.win32.isAbsolute(appPath)
      ? path.win32.resolve(appPath)
      : path.win32.resolve(root, appPath);
    if (resolved !== root && !resolved.toLowerCase().startsWith(`${root.toLowerCase()}\\`)) {
      throw new Error(`Environment app path must stay inside the workspace root: ${appPath}`);
    }
    return resolved;
  }

  const root = path.posix.resolve(workspaceRoot.replaceAll('\\', '/'));
  const normalizedInput = appPath.replaceAll('\\', '/');
  const resolved = path.posix.isAbsolute(normalizedInput)
    ? path.posix.resolve(normalizedInput)
    : path.posix.resolve(root, normalizedInput);
  if (resolved !== root && !resolved.startsWith(`${root}/`)) {
    throw new Error(`Environment app path must stay inside the workspace root: ${appPath}`);
  }
  return resolved;
}

export async function getWorkspaceEnvStatus(options: {
  workspace: Workspace;
  appPath: string;
  expected?: WorkspaceEnvExpectedVar[];
}): Promise<WorkspaceEnvStatus> {
  const filesystem = getFilesystem(options.workspace);
  const detectedByFile = new Map<WorkspaceEnvFile, Map<string, boolean>>();
  for (const envFile of ENV_FILES) {
    detectedByFile.set(envFile, await readEnvFilePresence(filesystem, joinWorkspacePath(options.appPath, envFile)));
  }

  const byKey = new Map<string, WorkspaceEnvStatusVar>();
  for (const expected of options.expected ?? []) {
    validateEnvKeyName(expected.name);
    const envFile = expected.envFile ?? '.env.local';
    byKey.set(expected.name, {
      name: expected.name,
      required: expected.required,
      secret: expected.secret,
      hasValue: detectedByFile.get(envFile)?.get(expected.name) ?? hasValueInAnyFile(detectedByFile, expected.name),
      envFile,
      source: 'recipe',
      ...(expected.description ? { description: expected.description } : {}),
    });
  }

  for (const envFile of ENV_FILES) {
    for (const [name, hasValue] of detectedByFile.get(envFile) ?? []) {
      if (byKey.has(name)) continue;
      byKey.set(name, {
        name,
        required: false,
        secret: true,
        hasValue,
        envFile,
        source: 'env-file',
      });
    }
  }

  return {
    appPath: options.appPath,
    vars: [...byKey.values()].sort(compareEnvStatusVars),
  };
}

export async function updateWorkspaceEnv(options: {
  workspace: Workspace;
  appPath: string;
  values: WorkspaceEnvValue[];
  expected?: WorkspaceEnvExpectedVar[];
}): Promise<{
  keysAdded: string[];
  keysUpdated: string[];
  status: WorkspaceEnvStatus;
}> {
  const filesystem = getFilesystem(options.workspace);
  const keysAdded: string[] = [];
  const keysUpdated: string[] = [];
  const byFile = new Map<WorkspaceEnvFile, WorkspaceEnvValue[]>();

  for (const value of options.values) {
    validateEnvKeyName(value.name);
    const existing = byFile.get(value.envFile) ?? [];
    existing.push(value);
    byFile.set(value.envFile, existing);
  }

  for (const [envFile, values] of byFile) {
    const targetPath = joinWorkspacePath(options.appPath, envFile);
    const current = await readFileIfExists(filesystem, targetPath);
    const updated = updateEnvFileContent(current, values, keysAdded, keysUpdated);
    await filesystem.writeFile(targetPath, updated, { recursive: true });
  }

  return {
    keysAdded,
    keysUpdated,
    status: await getWorkspaceEnvStatus({
      workspace: options.workspace,
      appPath: options.appPath,
      expected: options.expected,
    }),
  };
}

function getFilesystem(workspace: Workspace): NonNullable<Workspace['filesystem']> {
  const filesystem = workspace.filesystem;
  if (!filesystem) throw new Error('Current workspace has no filesystem provider.');
  return filesystem;
}

function updateEnvFileContent(
  current: string,
  values: WorkspaceEnvValue[],
  keysAdded: string[],
  keysUpdated: string[],
): string {
  const pending = new Map(values.map((value) => [value.name, value]));
  const lines = current ? current.replace(/\r\n/g, '\n').split('\n') : [];
  const nextLines = lines.map((line) => {
    const key = parseEnvLineKey(line);
    if (!key || !pending.has(key)) return line;
    const value = pending.get(key)!;
    pending.delete(key);
    keysUpdated.push(key);
    return formatEnvLine(value.name, value.value);
  });

  if (nextLines.length > 0 && nextLines[nextLines.length - 1] !== '') {
    nextLines.push('');
  }

  for (const value of pending.values()) {
    keysAdded.push(value.name);
    nextLines.push(formatEnvLine(value.name, value.value));
  }

  return `${nextLines.join('\n').replace(/\n+$/, '')}\n`;
}

async function readEnvFilePresence(filesystem: NonNullable<Workspace['filesystem']>, filePath: string): Promise<Map<string, boolean>> {
  return parseEnvPresence(await readFileIfExists(filesystem, filePath));
}

async function readFileIfExists(filesystem: NonNullable<Workspace['filesystem']>, filePath: string): Promise<string> {
  try {
    if (!await filesystem.exists(filePath)) return '';
    const content = await filesystem.readFile(filePath, { encoding: 'utf8' });
    return Buffer.isBuffer(content) ? content.toString('utf8') : String(content);
  } catch {
    return '';
  }
}

function parseEnvPresence(content: string): Map<string, boolean> {
  const result = new Map<string, boolean>();
  for (const line of content.replace(/\r\n/g, '\n').split('\n')) {
    const key = parseEnvLineKey(line);
    if (!key) continue;
    const value = line.replace(/^\s*(?:export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=\s*/, '');
    result.set(key, value.trim().length > 0);
  }
  return result;
}

function parseEnvLineKey(line: string): string | null {
  const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
  return match?.[1] ?? null;
}

function formatEnvLine(name: string, value: string): string {
  return `${name}=${JSON.stringify(value)}`;
}

function hasValueInAnyFile(
  detectedByFile: Map<WorkspaceEnvFile, Map<string, boolean>>,
  name: string,
): boolean {
  return ENV_FILES.some((envFile) => detectedByFile.get(envFile)?.get(name) === true);
}

function compareEnvStatusVars(a: WorkspaceEnvStatusVar, b: WorkspaceEnvStatusVar): number {
  if (a.required !== b.required) return a.required ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function joinWorkspacePath(basePath: string, filename: string): string {
  if (usesWindowsPaths(basePath)) return path.win32.join(basePath, filename);
  return path.posix.join(basePath.replaceAll('\\', '/'), filename);
}

function usesWindowsPaths(input: string): boolean {
  return /^[A-Za-z]:[\\/]/.test(input) || input.includes('\\');
}
