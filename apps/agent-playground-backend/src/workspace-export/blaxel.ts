import { createReadStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ProvisionedWorkspace } from "../workspace-provider.js";
import {
  buildTarExcludeArgs,
  safeExportFilename,
  shellQuote,
} from "./policy.js";
import type { WorkspaceExportOptions, WorkspaceExportResult } from "./types.js";
import { WorkspaceExportError } from "./types.js";

function getExitCode(result: any): number {
  return result?.exitCode ?? result?.exit_code ?? result?.statusCode ?? 0;
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const message = `${error?.message ?? String(error)} ${error?.cause?.message ?? ""}`;
      const retryable =
        message.includes("fetch failed") ||
        message.includes("ECONNRESET") ||
        message.includes("socket hang up");
      if (!retryable || attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function exportBlaxelWorkspace(
  provisioned: ProvisionedWorkspace,
  options: WorkspaceExportOptions,
): Promise<WorkspaceExportResult> {
  const sandbox = provisioned.sandboxInstance;
  if (!sandbox?.process?.exec || !sandbox?.fs?.download) {
    throw new WorkspaceExportError(
      "Sandbox provider does not expose Blaxel archive export APIs.",
      501,
    );
  }

  const workspaceRoot = provisioned.workspacePath ?? "/workspace";
  const tempDir = await mkdtemp(join(tmpdir(), "augment-export-"));
  const filename = safeExportFilename({
    productId: options.productId,
    sessionId: options.sessionId,
  });
  const localArchivePath = join(tempDir, filename);
  const remoteArchivePath = `/tmp/augment-export-${options.sessionId.replace(/[^a-zA-Z0-9._-]/g, "-")}-${Date.now()}.tar.gz`;
  const excludeArgs = buildTarExcludeArgs();
  const command = `tar ${excludeArgs} -czf ${shellQuote(remoteArchivePath)} -C ${shellQuote(workspaceRoot)} .`;

  try {
    const result: any = await withRetry(() =>
      sandbox.process.exec({
        command,
        waitForCompletion: true,
        workingDir: "/",
        timeout: 60_000,
      }),
    );
    const exitCode = getExitCode(result);
    if (exitCode !== 0) {
      throw new WorkspaceExportError(
        `Failed to create Blaxel workspace archive: ${result?.stderr ?? result?.stdout ?? `exit ${exitCode}`}`,
        500,
      );
    }

    await withRetry(() =>
      sandbox.fs.download(remoteArchivePath, localArchivePath),
    );

    return {
      filename,
      contentType: "application/gzip",
      stream: createReadStream(localArchivePath),
      cleanup: async () => {
        await sandbox.process
          .exec({
            command: `rm -f ${shellQuote(remoteArchivePath)}`,
            waitForCompletion: true,
            workingDir: "/",
          })
          .catch(() => {});
        await rm(tempDir, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await sandbox.process
      .exec({
        command: `rm -f ${shellQuote(remoteArchivePath)}`,
        waitForCompletion: true,
        workingDir: "/",
      })
      .catch(() => {});
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}
