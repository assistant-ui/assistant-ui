import { downloadTemplate } from "giget";

export const DOWNLOAD_TIMEOUT_MS = 30_000;

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
    if (!download || settled) {
      await cleanup();
    } else {
      void download.then(cleanup, cleanup);
    }
    if (origDebug !== undefined) process.env.DEBUG = origDebug;
  }
}
