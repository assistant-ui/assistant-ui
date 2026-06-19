const SANDBOX_FETCH_HEADERS = {
  Accept: "application/zip, application/octet-stream, */*",
  // Blaxel preview hosts intermittently reset Node's default fetch without a UA.
  "User-Agent": "curl/8.7.1",
};

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 300;

function isRetryableFetchError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const cause = error.cause as { code?: string } | undefined;
  const code = cause?.code ?? error.message;
  return (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    code === "fetch failed"
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchSandboxResource(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fetch(url, {
        ...init,
        cache: "no-store",
        headers: {
          ...SANDBOX_FETCH_HEADERS,
          ...init?.headers,
        },
      });
    } catch (error) {
      lastError = error;
      if (!isRetryableFetchError(error) || attempt === MAX_ATTEMPTS) {
        throw error;
      }
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError;
}
