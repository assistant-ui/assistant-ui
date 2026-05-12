/**
 * Minimal @blaxel/core wrapper for the xulux coding agent.
 * Provisions a cloud sandbox and returns a single exec() function —
 * all file reads, writes, and shell ops go through shell commands.
 *
 * Required env vars:
 *   BL_WORKSPACE=<your-blaxel-workspace>
 *   BL_API_KEY=<your-api-key>
 *
 * Optional:
 *   BL_SANDBOX_TEMPLATE=<image-name>   (defaults to blaxel/node-sandbox)
 *   BL_REGION=<region>                 (defaults to us-pdx-1)
 */

import { createReadStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MAX_RETRIES = 3;

const DEFAULT_TAR_EXCLUDES = [
  "./node_modules",
  "./.next",
  "./dist",
  "./build",
  "./out",
  "./.turbo",
  "./.cache",
  "./.git",
  "./.env",
  "./.env.local",
  "./.env.*.local",
  "./.codingagent",
  "./.agent",
];

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function buildTarExcludeArgs(): string {
  return DEFAULT_TAR_EXCLUDES.map(
    (pattern) => `--exclude=${shellQuote(pattern)}`,
  ).join(" ");
}

function safeExportFilename(sessionId: string): string {
  const session =
    sessionId
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .slice(0, 12) || "session";
  return `xulux-workspace-${session}.tar.gz`;
}

function toSandboxName(sessionId: string): string {
  const safe = sessionId
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return `xulux-${safe}`.slice(0, 40).replace(/-+$/g, "");
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message ?? err);
      const isTransient =
        msg.includes("fetch failed") ||
        msg.includes("ECONNRESET") ||
        msg.includes("socket hang up");
      if (isTransient && attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function waitUntilReachable(sb: any, maxWaitMs = 120_000): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      await sb.process.exec({
        command: "true",
        waitForCompletion: true,
        workingDir: "/",
      });
      return;
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  const msg =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Sandbox not reachable after ${maxWaitMs}ms: ${msg}`);
}

export type SandboxExecResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

export type SandboxExec = (
  command: string,
  cwd?: string,
) => Promise<SandboxExecResult>;

export type ProvisionedSandbox = {
  exec: SandboxExec;
  previewUrl: string;
};

export type WorkspaceArchive = {
  filename: string;
  contentType: string;
  stream: ReturnType<typeof createReadStream>;
  cleanup: () => Promise<void>;
};

export async function provisionSandbox(
  sessionId: string,
): Promise<ProvisionedSandbox> {
  let SandboxInstance: any;
  try {
    const mod = await import("@blaxel/core");
    SandboxInstance = mod.SandboxInstance;
  } catch {
    throw new Error(
      "Missing @blaxel/core — run: pnpm add @blaxel/core\n" +
        "Set BL_WORKSPACE and BL_API_KEY in your .env file.",
    );
  }

  const sandboxName = toSandboxName(sessionId);

  const sb = await SandboxInstance.createIfNotExists({
    name: sandboxName,
    image: process.env.BL_SANDBOX_TEMPLATE ?? "blaxel/node-sandbox",
    region: process.env.BL_REGION ?? "us-pdx-1",
    memory: 4096,
    ports: [{ name: "preview", target: 3000, protocol: "HTTP" }],
  });

  await waitUntilReachable(sb);
  await withRetry(() =>
    sb.process.exec({
      command: "mkdir -p /workspace",
      waitForCompletion: true,
      workingDir: "/",
    }),
  );

  const preview = await sb.previews.createIfNotExists({
    metadata: { name: "preview" },
    spec: { port: 3000, public: true },
  });
  const previewUrl = preview.spec?.url as string;

  const exec: SandboxExec = async (command: string, cwd = "/workspace") => {
    const result: any = await withRetry(() =>
      sb.process.exec({ command, waitForCompletion: true, workingDir: cwd }),
    );
    return {
      stdout: String(result?.stdout ?? ""),
      stderr: String(result?.stderr ?? ""),
      exitCode: result?.exitCode ?? 0,
    };
  };

  return { exec, previewUrl };
}

export async function fetchPreviewUrl(sessionId: string): Promise<string> {
  const { SandboxInstance } = await import("@blaxel/core");
  const sb = await SandboxInstance.get(toSandboxName(sessionId));
  const preview = await sb.previews.createIfNotExists({
    metadata: { name: "preview" },
    spec: { port: 3000, public: true },
  });
  return preview.spec?.url as string;
}

export async function exportWorkspaceArchive(
  sessionId: string,
): Promise<WorkspaceArchive> {
  const { SandboxInstance } = await import("@blaxel/core");
  const sb = await SandboxInstance.get(toSandboxName(sessionId));
  if (!sb?.process?.exec || !sb?.fs?.download) {
    throw new Error("Sandbox export APIs are not available.");
  }

  const tempDir = await mkdtemp(join(tmpdir(), "xulux-export-"));
  const filename = safeExportFilename(sessionId);
  const localArchivePath = join(tempDir, filename);
  const remoteArchivePath = `/tmp/xulux-export-${sessionId.replace(
    /[^a-zA-Z0-9._-]/g,
    "-",
  )}-${Date.now()}.tar.gz`;
  const excludeArgs = buildTarExcludeArgs();
  const command = [
    "set -eu",
    'gitignore_args=""',
    'if [ -f ".gitignore" ]; then gitignore_args="--exclude-from=.gitignore"; fi',
    `tar ${excludeArgs} $gitignore_args -czf ${shellQuote(remoteArchivePath)} -C /workspace .`,
  ].join("\n");

  const cleanup = async () => {
    await sb.process
      .exec({
        command: `rm -f ${shellQuote(remoteArchivePath)}`,
        waitForCompletion: true,
        workingDir: "/",
      })
      .catch(() => {});
    await rm(tempDir, { recursive: true, force: true });
  };

  try {
    const result: any = await withRetry(() =>
      sb.process.exec({
        command,
        waitForCompletion: true,
        workingDir: "/workspace",
        timeout: 60_000,
      }),
    );
    const exitCode = result?.exitCode ?? result?.exit_code ?? 0;
    if (exitCode !== 0) {
      throw new Error(
        `Failed to create workspace archive: ${result?.stderr ?? result?.stdout ?? `exit ${exitCode}`}`,
      );
    }

    await withRetry(() => sb.fs.download(remoteArchivePath, localArchivePath));

    return {
      filename,
      contentType: "application/gzip",
      stream: createReadStream(localArchivePath),
      cleanup,
    };
  } catch (error) {
    await cleanup().catch(() => {});
    throw error;
  }
}
