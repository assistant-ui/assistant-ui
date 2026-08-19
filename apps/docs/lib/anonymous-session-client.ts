let sessionPromise: Promise<void> | null = null;
let sessionToken: string | null = null;

const ANONYMOUS_SESSION_HEADER = "x-assistant-ui-anonymous-session";

export function ensureAnonymousSession(): Promise<void> {
  sessionPromise ??= fetch("/api/anonymous-session", {
    cache: "no-store",
    credentials: "same-origin",
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error("Unable to start an anonymous session");
      }
      if (response.status === 204) return;

      const body = (await response.json()) as { token?: unknown };
      if (typeof body.token !== "string" || !body.token) {
        throw new Error("Anonymous session token is missing");
      }
      sessionToken = body.token;
    })
    .catch((error: unknown) => {
      sessionPromise = null;
      throw error;
    });
  return sessionPromise;
}

export const anonymousSessionFetch: typeof fetch = async (input, init) => {
  const requestTemplate =
    input instanceof Request || init?.body != null
      ? new Request(input, init)
      : null;

  const send = () => {
    if (!sessionToken) {
      return requestTemplate
        ? fetch(requestTemplate.clone())
        : fetch(input, init);
    }
    const headers = new Headers(requestTemplate?.headers ?? init?.headers);
    headers.set(ANONYMOUS_SESSION_HEADER, sessionToken);
    if (requestTemplate) {
      return fetch(requestTemplate.clone(), { headers });
    }
    return fetch(input, { ...init, headers });
  };

  await ensureAnonymousSession();
  const response = await send();
  if (response.status !== 401) return response;

  sessionPromise = null;
  sessionToken = null;
  await ensureAnonymousSession();
  return send();
};
