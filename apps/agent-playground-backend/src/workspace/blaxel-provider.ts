/**
 * Blaxel cloud sandbox workspace provider.
 *
 * Uses @blaxel/core to provision a cloud sandbox for the agent session.
 * Install the package before using this provider:
 *
 *   npm install @blaxel/core
 *
 * Credentials are read from environment variables (or .env file):
 *   BL_WORKSPACE=<your-blaxel-workspace>
 *   BL_API_KEY=<your-api-key>
 *   BL_SANDBOX_TEMPLATE=<template-name>  (optional, sets the sandbox image)
 *   BL_REGION=<region>                   (optional, defaults to us-pdx-1)
 *
 * Note: sandbox.wait() in @blaxel/core is deprecated and a no-op.
 * We verify readiness by retrying a real fs operation until it succeeds.
 */

import type { ProviderStatus } from '@mastra/core/workspace';
import {
  FileNotFoundError,
  MastraFilesystem,
  MastraSandbox,
  ProcessHandle,
  SandboxProcessManager,
  Workspace,
} from '@mastra/core/workspace';
import type { FileContent, FileStat, FileEntry, ReadOptions, WriteOptions, ListOptions, RemoveOptions, CopyOptions } from '@mastra/core/workspace';
import type {
  CommandResult,
  ExecuteCommandOptions,
  ProcessInfo,
  SpawnProcessOptions,
} from '@mastra/core/workspace';
import { TOOL_NAME_OVERRIDES } from '../tool-names.js';
import { workspaceToolsEnabled } from '../workspace-enabled.js';
import { sessionWorkspaceRegistry } from '../workspace-provider.js';
import type { WorkspaceProvider, ProvisionedWorkspace } from '../workspace-provider.js';
import {
  LEGACY_SANDBOX_WORKSPACE_ENTRIES,
  resolveSandboxTemplateSpec,
} from '../sandbox-templates/index.js';
import { installWorkspaceEnvInjection } from '../workspace-env/runtime-injection.js';

// ---------------------------------------------------------------------------
// Retry helper — handles H2 session staleness in @blaxel/core
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function commandExitCode(result: any, fallback = 0): number {
  return result?.exitCode ?? result?.exit_code ?? result?.statusCode ?? fallback;
}

function normalizeProcessLogs(proc: any): { stdout: string; stderr: string } {
  const logs = proc?.logs;
  if (typeof logs === 'string') return { stdout: logs, stderr: '' };
  return {
    stdout: String(proc?.stdout ?? logs?.stdout ?? logs?.out ?? ''),
    stderr: String(proc?.stderr ?? logs?.stderr ?? logs?.err ?? ''),
  };
}

function processIsRunning(proc: any): boolean {
  const status = String(proc?.status ?? proc?.state ?? '').toLowerCase();
  if (!status) return proc?.exitCode === undefined && proc?.exit_code === undefined;
  return ['running', 'starting', 'pending'].includes(status);
}

function parseWaitPort(command: string): number | undefined {
  const patterns = [
    /(?:^|\s)--port(?:=|\s+)(\d{1,5})(?:\s|$)/,
    /(?:^|\s)-p(?:=|\s+)(\d{1,5})(?:\s|$)/,
    /(?:^|\s)PORT=(\d{1,5})(?:\s|$)/,
  ];
  for (const pattern of patterns) {
    const match = command.match(pattern);
    const port = match?.[1] ? Number(match[1]) : NaN;
    if (Number.isInteger(port) && port > 0 && port <= 65535) return port;
  }
  return undefined;
}

async function withRetry<T>(fn: () => Promise<T>, _label?: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const msg = err?.message ?? String(err);
      const causeMsg = err?.cause?.message ?? '';
      const fullMsg = `${msg} ${causeMsg}`;
      // Only retry on transient network/H2 errors
      if (fullMsg.includes('fetch failed') || fullMsg.includes('ECONNRESET') || fullMsg.includes('socket hang up')) {
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
      }
      throw err;
    }
  }
  throw lastError;
}

async function writeBufferFile(sb: any, path: string, content: Buffer): Promise<void> {
  const tempPath = `/tmp/augment-write-${Date.now()}-${Math.random().toString(36).slice(2)}.b64`;
  await withRetry(() => sb.fs.write(tempPath, content.toString('base64')), `writeBase64(${path})`);
  try {
    const result: any = await withRetry(() => sb.process.exec({
      command: `base64 -d ${shellQuote(tempPath)} > ${shellQuote(path)}`,
      waitForCompletion: true,
      workingDir: '/',
    }), `decodeBase64(${path})`);
    const exitCode = commandExitCode(result);
    if (exitCode !== 0) {
      throw new Error(`Failed to decode binary content to ${path}: ${result?.stderr ?? result?.stdout ?? ''}`);
    }
  } finally {
    await sb.process.exec({
      command: `rm -f ${shellQuote(tempPath)}`,
      waitForCompletion: true,
      workingDir: '/',
    }).catch(() => {});
  }
}

/**
 * Verify the sandbox is truly reachable.
 * sandbox.wait() is deprecated/no-op in @blaxel/core — we must verify ourselves.
 */
async function waitUntilReachable(sb: any, maxWaitMs = 30_000): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      // Use process.exec as the readiness probe — it's more reliable than fs API
      await sb.process.exec({ command: 'true', waitForCompletion: true, workingDir: '/' });
      return;
    } catch (err) {
      lastError = err;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error(`Sandbox not reachable after ${maxWaitMs}ms: ${lastError}`);
}

export function resolveSandboxTemplate(
  env: NodeJS.ProcessEnv = process.env,
): string {
  return resolveSandboxTemplateSpec(env).image;
}

async function cleanupLegacyWorkspaceEntries(
  sb: any,
  workspaceRoot: string,
): Promise<void> {
  for (const entry of LEGACY_SANDBOX_WORKSPACE_ENTRIES) {
    const entryPath = workspaceRoot.endsWith('/')
      ? `${workspaceRoot}${entry}`
      : `${workspaceRoot}/${entry}`;
    await withRetry(() => sb.process.exec({
      command: `rm -rf "${entryPath}"`,
      waitForCompletion: true,
      workingDir: '/',
    }), `cleanup(${entryPath})`);
  }
}

// ---------------------------------------------------------------------------
// BlaxelFilesystem — wraps @blaxel/core SandboxInstance.fs + process
// ---------------------------------------------------------------------------

class BlaxelFilesystem extends MastraFilesystem {
  readonly id: string;
  readonly name = 'BlaxelFilesystem';
  readonly provider = 'blaxel';
  status: ProviderStatus = 'pending';

  constructor(
    private readonly sb: any,
    sessionId: string,
  ) {
    super({ name: 'BlaxelFilesystem' });
    this.id = `blaxel-fs-${sessionId}`;
  }

  async init(): Promise<void> {
    // wait() is a no-op in current @blaxel/core — readiness is verified
    // in provision() via waitUntilReachable() before this is called.
    this.status = 'ready' as ProviderStatus;
  }

  async destroy(): Promise<void> {
    this.status = 'destroyed' as ProviderStatus;
  }

  async readFile(path: string, _options?: ReadOptions): Promise<string | Buffer> {
    await this.ensureReady();
    try {
      return await withRetry(() => this.sb.fs.read(path), `readFile(${path})`);
    } catch (err: any) {
      const msg = String(err?.message ?? err);
      if (msg.includes('no such file') || msg.includes('404')) {
        throw new FileNotFoundError(path);
      }
      throw err;
    }
  }

  async writeFile(path: string, content: FileContent, options?: WriteOptions): Promise<void> {
    await this.ensureReady();
    // Match LocalFilesystem behavior: create parent dirs unless recursive === false
    if (options?.recursive !== false) {
      const dir = path.substring(0, path.lastIndexOf('/'));
      if (dir) {
        // Use process.exec for mkdir — more reliable than fs.mkdir
        // (Blaxel fs API sometimes returns 404 on stat for paths that exist)
        await this.sb.process.exec({
          command: `mkdir -p ${shellQuote(dir)}`,
          waitForCompletion: true,
          workingDir: '/',
        }).catch(() => {});
      }
    }
    if (Buffer.isBuffer(content)) {
      await writeBufferFile(this.sb, path, content);
      return;
    }
    await withRetry(() => this.sb.fs.write(path, String(content)), `writeFile(${path})`);
  }

  async appendFile(path: string, content: FileContent): Promise<void> {
    await this.ensureReady();
    if (Buffer.isBuffer(content)) {
      const tempPath = `/tmp/augment-append-${Date.now()}-${Math.random().toString(36).slice(2)}.b64`;
      await withRetry(() => this.sb.fs.write(tempPath, content.toString('base64')), `appendBase64(${path})`);
      try {
        const result: any = await withRetry(() => this.sb.process.exec({
          command: `base64 -d ${shellQuote(tempPath)} >> ${shellQuote(path)}`,
          waitForCompletion: true,
          workingDir: '/',
        }), `decodeAppendBase64(${path})`);
        const exitCode = commandExitCode(result);
        if (exitCode !== 0) {
          throw new Error(`Failed to append binary content to ${path}: ${result?.stderr ?? result?.stdout ?? ''}`);
        }
      } finally {
        await this.sb.process.exec({
          command: `rm -f ${shellQuote(tempPath)}`,
          waitForCompletion: true,
          workingDir: '/',
        }).catch(() => {});
      }
      return;
    }
    let existing = '';
    try { existing = await withRetry(() => this.sb.fs.read(path)); } catch {}
    await withRetry(() => this.sb.fs.write(path, existing + String(content)), `appendFile(${path})`);
  }

  async deleteFile(path: string, _options?: RemoveOptions): Promise<void> {
    await this.ensureReady();
    await withRetry(() => this.sb.fs.rm(path, false), `deleteFile(${path})`);
  }

  async copyFile(src: string, dest: string, _options?: CopyOptions): Promise<void> {
    await this.ensureReady();
    // Blaxel SDK doesn't have a cp method — use process.exec
    await withRetry(() => this.sb.process.exec({
      command: `cp "${src}" "${dest}"`,
      waitForCompletion: true,
      workingDir: '/',
    }), `copyFile(${src}, ${dest})`);
  }

  async moveFile(src: string, dest: string, _options?: CopyOptions): Promise<void> {
    await this.ensureReady();
    await withRetry(() => this.sb.process.exec({
      command: `mv "${src}" "${dest}"`,
      waitForCompletion: true,
      workingDir: '/',
    }), `moveFile(${src}, ${dest})`);
  }

  async mkdir(path: string, _options?: { recursive?: boolean }): Promise<void> {
    await this.ensureReady();
    // Use process.exec — fs.mkdir has stat issues on some paths
    await withRetry(() => this.sb.process.exec({
      command: `mkdir -p "${path}"`,
      waitForCompletion: true,
      workingDir: '/',
    }), `mkdir(${path})`);
  }

  async rmdir(path: string, options?: RemoveOptions): Promise<void> {
    await this.ensureReady();
    const flag = options?.recursive ? '-rf' : '-d';
    await withRetry(() => this.sb.process.exec({
      command: `rm ${flag} "${path}"`,
      waitForCompletion: true,
      workingDir: '/',
    }), `rmdir(${path})`);
  }

  async readdir(path: string, _options?: ListOptions): Promise<FileEntry[]> {
    await this.ensureReady();
    // Use process.exec for listing — fs.ls returns 404 on some valid paths
    const result: any = await withRetry(() => this.sb.process.exec({
      command: `ls -1p "${path}"`,
      waitForCompletion: true,
      workingDir: '/',
    }));
    const entries: FileEntry[] = [];
    for (const line of (result.stdout ?? '').split('\n').filter(Boolean)) {
      if (line.endsWith('/')) {
        entries.push({ name: line.slice(0, -1), type: 'directory' });
      } else {
        entries.push({ name: line, type: 'file' });
      }
    }
    return entries;
  }

  async exists(path: string): Promise<boolean> {
    const result: any = await withRetry(() => this.sb.process.exec({
      command: `test -e "${path}" && echo "yes" || echo "no"`,
      waitForCompletion: true,
      workingDir: '/',
    }));
    return (result.stdout ?? '').trim() === 'yes';
  }

  async stat(path: string): Promise<FileStat> {
    await this.ensureReady();
    // Use process.exec for stat — fs.ls API has issues with some paths
    const result: any = await withRetry(() => this.sb.process.exec({
      command: `stat -c '%n|%F|%s|%Y' "${path}" 2>/dev/null`,
      waitForCompletion: true,
      workingDir: '/',
    }));
    const stdout = (result.stdout ?? '').trim();
    if (!stdout || (result.exitCode ?? 0) !== 0) {
      throw new FileNotFoundError(path);
    }
    const [name, fileType, sizeStr, mtimeStr] = stdout.split('|');
    const isDir = fileType?.includes('directory') ?? false;
    const mtime = new Date(parseInt(mtimeStr ?? '0', 10) * 1000);
    return {
      name: name?.split('/').pop() ?? '',
      path,
      type: isDir ? 'directory' : 'file',
      size: parseInt(sizeStr ?? '0', 10),
      createdAt: mtime,
      modifiedAt: mtime,
    };
  }
}

// ---------------------------------------------------------------------------
// BlaxelSandbox — wraps @blaxel/core SandboxInstance.process
// ---------------------------------------------------------------------------

class BlaxelProcessHandle extends ProcessHandle {
  readonly pid: string;
  exitCode: number | undefined;
  private readonly startTime = Date.now();

  constructor(
    private readonly sb: any,
    pid: string,
    options?: SpawnProcessOptions,
  ) {
    super(options);
    this.pid = pid;
  }

  private async refresh(): Promise<any | undefined> {
    try {
      const proc = await withRetry(() => this.sb.process.get(this.pid), `process.get(${this.pid})`);
      const { stdout, stderr } = normalizeProcessLogs(proc);
      if (stdout && stdout.length > this.stdout.length) {
        this.emitStdout(stdout.slice(this.stdout.length));
      }
      if (stderr && stderr.length > this.stderr.length) {
        this.emitStderr(stderr.slice(this.stderr.length));
      }
      if (!processIsRunning(proc)) {
        this.exitCode = commandExitCode(proc);
      }
      return proc;
    } catch {
      if (this.exitCode === undefined) this.exitCode = 1;
      return undefined;
    }
  }

  async kill(): Promise<boolean> {
    try {
      await withRetry(() => this.sb.process.kill(this.pid), `process.kill(${this.pid})`);
      this.exitCode = this.exitCode ?? 137;
      return true;
    } catch {
      return false;
    }
  }

  async sendStdin(_data: string): Promise<void> {
    throw new Error('Blaxel process stdin is not supported by this provider.');
  }

  async wait(): Promise<CommandResult> {
    while (this.exitCode === undefined) {
      await this.refresh();
      if (this.exitCode !== undefined) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return {
      command: this.command,
      exitCode: this.exitCode ?? 1,
      stdout: this.stdout,
      stderr: this.stderr,
      success: (this.exitCode ?? 1) === 0,
      executionTimeMs: Date.now() - this.startTime,
    };
  }
}

class BlaxelProcessManager extends SandboxProcessManager<BlaxelSandbox> {
  constructor(private readonly sb: any) {
    super();
  }

  async spawn(command: string, options: SpawnProcessOptions = {}): Promise<ProcessHandle> {
    const name = `augment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const port = parseWaitPort(command);
    const execOptions: Record<string, unknown> = {
      name,
      command,
      waitForCompletion: false,
      workingDir: options.cwd ?? '/workspace',
      ...(options.env ? { env: options.env as Record<string, string> } : {}),
      ...(port ? { waitForPorts: [port] } : {}),
      ...(options.timeout ? { timeout: Math.min(options.timeout, 60_000) } : {}),
    };
    const result: any = await withRetry(() => this.sb.process.exec(execOptions), `spawn(${command})`);
    const handle = new BlaxelProcessHandle(this.sb, name, options);
    const { stdout, stderr } = normalizeProcessLogs(result);
    if (stdout) handle.emitStdout(stdout);
    if (stderr) handle.emitStderr(stderr);
    this._tracked.set(handle.pid, handle);
    return handle;
  }

  async list(): Promise<ProcessInfo[]> {
    const processes = await Promise.all([...this._tracked.values()].map(async (handle) => {
      await this.get(handle.pid);
      return {
        pid: handle.pid,
        command: handle.command,
        running: handle.exitCode === undefined,
        ...(handle.exitCode !== undefined ? { exitCode: handle.exitCode } : {}),
      };
    }));
    return processes.filter((process) => !this._dismissed.has(process.pid));
  }
}

class BlaxelSandbox extends MastraSandbox {
  readonly id: string;
  readonly name = 'BlaxelSandbox';
  readonly provider = 'blaxel';
  status: ProviderStatus = 'pending';
  declare readonly processes: BlaxelProcessManager;

  constructor(
    private readonly sb: any,
    sessionId: string,
  ) {
    super({
      name: 'BlaxelSandbox',
      processes: new BlaxelProcessManager(sb),
    });
    this.id = `blaxel-sandbox-${sessionId}`;
  }

  async start(): Promise<void> {
    // Readiness verified in provision() via waitUntilReachable()
    this.status = 'running' as ProviderStatus;
  }

  async stop(): Promise<void> {
    this.status = 'stopped' as ProviderStatus;
  }

  async destroy(): Promise<void> {
    await this.sb.delete();
    this.status = 'destroyed' as ProviderStatus;
  }

  async executeCommand(
    command: string,
    args?: string[],
    options?: ExecuteCommandOptions,
  ): Promise<CommandResult> {
    const fullCmd = args?.length ? `${command} ${args.join(' ')}` : command;
    const start = Date.now();
    const timeoutSeconds = options?.timeout;

    if (timeoutSeconds && timeoutSeconds > 60) {
      const name = `augment-fg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      await withRetry(() => this.sb.process.exec({
        name,
        command: fullCmd,
        waitForCompletion: false,
        workingDir: options?.cwd ?? '/workspace',
        ...(options?.env ? { env: options.env as Record<string, string> } : {}),
        timeout: timeoutSeconds,
      }), `execAsync(${command})`);

      let result: any;
      try {
        result = await withRetry(() => this.sb.process.wait(name, {
          maxWait: timeoutSeconds * 1000,
          interval: 1000,
        }), `wait(${command})`);
      } catch (err) {
        await this.sb.process.kill(name).catch(() => {});
        throw err;
      }

      const logs = normalizeProcessLogs(result);
      if (!logs.stdout) {
        logs.stdout = await this.sb.process.logs(name, 'stdout').catch(() => '');
      }
      if (!logs.stderr) {
        logs.stderr = await this.sb.process.logs(name, 'stderr').catch(() => '');
      }

      const exitCode = commandExitCode(result, result?.status === 'completed' ? 0 : 1);
      return {
        command,
        args,
        exitCode,
        stdout: logs.stdout,
        stderr: logs.stderr,
        success: exitCode === 0,
        executionTimeMs: Date.now() - start,
      };
    }

    const result: any = await withRetry(() => this.sb.process.exec({
      command: fullCmd,
      waitForCompletion: true,
      workingDir: options?.cwd ?? '/workspace',
      ...(options?.env ? { env: options.env as Record<string, string> } : {}),
      ...(timeoutSeconds ? { timeout: Math.min(timeoutSeconds, 60) } : {}),
    }), `exec(${command})`);
    return {
      command,
      args,
      exitCode: result.exitCode ?? 0,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      success: (result.exitCode ?? 0) === 0,
      executionTimeMs: Date.now() - start,
    };
  }
}

// ---------------------------------------------------------------------------
// BlaxelWorkspaceProvider
// ---------------------------------------------------------------------------

export class BlaxelWorkspaceProvider implements WorkspaceProvider {
  async provision({
    sessionId,
    cleanupOnDestroy = false,
  }: {
    sessionId: string;
    mode?: 'empty' | 'direct';
    cleanupOnDestroy?: boolean;
  }): Promise<ProvisionedWorkspace> {
    let SandboxInstance: any;
    try {
      const mod = await import('@blaxel/core');
      SandboxInstance = mod.SandboxInstance;
    } catch {
      throw new Error(
        'BlaxelWorkspaceProvider requires @blaxel/core.\n' +
          'Run: npm install @blaxel/core\n' +
          'And set BL_WORKSPACE and BL_API_KEY environment variables.',
      );
    }

    const templateSpec = resolveSandboxTemplateSpec();
    const region = process.env.BL_REGION ?? 'us-pdx-1';
    const sandboxName = `assistant-ui-workspace-${sessionId}`.slice(0, 40);

    const sbInstance = await SandboxInstance.createIfNotExists({
      name: sandboxName,
      image: templateSpec.image,
      region,
      memory: 4096,
      ports: [
        { name: 'next-dev', target: 3000, protocol: 'HTTP' },
        { name: 'test-preview', target: 4567, protocol: 'HTTP' },
      ],
    });

    // sandbox.wait() is deprecated/no-op in @blaxel/core.
    // Verify the sandbox is truly reachable with a real operation.
    await waitUntilReachable(sbInstance, 120_000);

    // Ensure the contract workspace root exists (may already exist from template image)
    await withRetry(() => sbInstance.process.exec({
      command: `mkdir -p "${templateSpec.workspaceRoot}"`,
      waitForCompletion: true,
      workingDir: '/',
    }));

    // The scaffold contract now treats legacy support files as contamination.
    // If older template or harness behavior left them behind, scrub them here.
    await cleanupLegacyWorkspaceEntries(sbInstance, templateSpec.workspaceRoot);

    const filesystem = new BlaxelFilesystem(sbInstance, sessionId);
    const sandbox = new BlaxelSandbox(sbInstance, sessionId);
    const workspace = new Workspace({
      filesystem,
      sandbox,
      tools: {
        enabled: workspaceToolsEnabled,
        ...TOOL_NAME_OVERRIDES,
      },
    });

    const provisioned: ProvisionedWorkspace = {
      workspace,
      workspacePath: templateSpec.workspaceRoot,
      providerKind: 'sandbox',
      sandboxInstance: sbInstance,
      cleanup: cleanupOnDestroy
        ? async () => {
            await workspace.destroy();
            await sbInstance.delete().catch(() => {});
          }
        : undefined,
    };

    installWorkspaceEnvInjection(provisioned);
    sessionWorkspaceRegistry.set(sessionId, provisioned);
    return provisioned;
  }
}
