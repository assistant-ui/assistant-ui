import { downloadTemplate } from "giget";

// setTimeout clamps larger delays to 1 ms.
const MAX_TIMER_DELAY_MS = 2_147_483_647;

export function resolveDownloadTimeoutMs(override: string | undefined): number {
  if (override) {
    const parsed = Number(override);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= MAX_TIMER_DELAY_MS) {
      return parsed;
    }
  }
  return 120_000;
}

export const DOWNLOAD_TIMEOUT_MS = resolveDownloadTimeoutMs(
  process.env.ASSISTANT_UI_DOWNLOAD_TIMEOUT_MS,
);

export class DownloadTimeoutError extends Error {
  constructor() {
    super(
      "Download timed out. The download can take longer on slow connections. Set ASSISTANT_UI_DOWNLOAD_TIMEOUT_MS to override the limit in milliseconds, or try again.",
    );
  }
}

export function resolveGitHubAuthToken(): string | undefined {
  const token =
    process.env.GIGET_AUTH ?? process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const trimmed = token?.trim();
  return trimmed || undefined;
}

export async function withStagedDownload<T>(
  source: string,
  options: NonNullable<Parameters<typeof downloadTemplate>[1]>,
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
        () => reject(new DownloadTimeoutError()),
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
