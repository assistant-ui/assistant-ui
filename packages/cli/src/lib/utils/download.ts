import { downloadTemplate } from "giget";

function resolveDownloadTimeoutMs(): number {
  const override = process.env.ASSISTANT_UI_DOWNLOAD_TIMEOUT;
  if (override) {
    const parsed = Number(override);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 120_000;
}

export const DOWNLOAD_TIMEOUT_MS = resolveDownloadTimeoutMs();

export function resolveGitHubAuthToken(): string | undefined {
  const token =
    process.env.GIGET_AUTH ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const trimmed = token?.trim();
  return trimmed || undefined;
}

export async function withStagedDownload<T>(
  source: string,
  options: NonNullable<Parameters<typeof downloadTemplate>[1]>,
  timeoutMessage: string,
  cleanup: () => void | Promise<void>,
  consumeDownload: (download: Promise<unknown>) => Promise<T>,
): Promise<T> {
  // giget logs to console.debug whenever DEBUG is set, which the `debug`
  // package does at module load for an unrelated namespace.
  const origDebug = process.env.DEBUG;
  delete process.env.DEBUG;
  let download: Promise<unknown> | undefined;
  let settled = false;
  try {
    const authToken = resolveGitHubAuthToken();
    download = downloadTemplate(source, {
      ...options,
      ...(authToken ? { auth: authToken } : {}),
    }).finally(() => {
      settled = true;
    });

    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(timeoutMessage)),
        DOWNLOAD_TIMEOUT_MS,
      );
    });
    try {
      return await consumeDownload(Promise.race([download, timeout]));
    } finally {
      clearTimeout(timer!);
    }
  } finally {
    try {
      if (!download || settled) {
        await cleanup();
      } else {
        void download.then(cleanup, cleanup);
      }
    } finally {
      if (origDebug !== undefined) process.env.DEBUG = origDebug;
    }
  }
}
