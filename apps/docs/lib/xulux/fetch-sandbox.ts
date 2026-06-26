import { setDefaultResultOrder } from "node:dns";

const SANDBOX_FETCH_HEADERS = {
  Accept: "application/zip, application/octet-stream, */*",
  // Blaxel preview hosts intermittently reset Node's default fetch path.
  "User-Agent": "curl/8.7.1",
};

setDefaultResultOrder("ipv4first");

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

function mergeHeaders(headers?: HeadersInit): Headers {
  const merged = new Headers(SANDBOX_FETCH_HEADERS);
  if (!headers) return merged;
  new Headers(headers).forEach((value, key) => merged.set(key, value));
  return merged;
}

export async function fetchSandboxResource(
  url: URL,
  init?: RequestInit,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fetch(url, {
        ...init,
        cache: "no-store",
        headers: mergeHeaders(init?.headers),
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
