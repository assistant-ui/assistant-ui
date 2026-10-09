const SANDBOX_FETCH_HEADERS = {
  Accept: "application/json, application/zip, application/octet-stream, */*",
  // Blaxel preview hosts intermittently reset Node's default fetch path.
  "User-Agent": "curl/8.7.1",
};

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 300;
const DEFAULT_TIMEOUT_MS = 30_000;

export interface SandboxFetchInit extends RequestInit {
  // Budget shared by every attempt.
  timeoutMs?: number;
  // "call" keeps the budget over the response body; "response" releases it once
  // the headers arrive, so a body handed straight to the client is bounded by
  // the route's maxDuration rather than by its throughput.
  timeoutScope?: "call" | "response";
}

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

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const settle = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", settle);
      resolve();
    };
    const timer = setTimeout(settle, ms);
    signal.addEventListener("abort", settle, { once: true });
  });
}

function mergeHeaders(headers?: HeadersInit): Headers {
  const merged = new Headers(SANDBOX_FETCH_HEADERS);
  if (!headers) return merged;
  new Headers(headers).forEach((value, key) => merged.set(key, value));
  return merged;
}

export async function fetchSandboxResource(
  url: string | URL,
  init?: SandboxFetchInit,
): Promise<Response> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    timeoutScope = "call",
    signal,
    ...requestInit
  } = init ?? {};
  const deadline = AbortSignal.timeout(timeoutMs);
  const gate = new AbortController();
  const forwardDeadline = () => gate.abort(deadline.reason);
  deadline.addEventListener("abort", forwardDeadline, { once: true });
  const abort = signal ? AbortSignal.any([signal, gate.signal]) : gate.signal;
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...requestInit,
        cache: "no-store",
        headers: mergeHeaders(requestInit.headers),
        signal: abort,
      });
      if (timeoutScope === "response") {
        deadline.removeEventListener("abort", forwardDeadline);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (
        abort.aborted ||
        !isRetryableFetchError(error) ||
        attempt === MAX_ATTEMPTS
      ) {
        throw error;
      }
      await sleep(RETRY_DELAY_MS * attempt, abort);
      if (abort.aborted) throw error;
    }
  }

  throw lastError;
}
