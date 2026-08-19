const ANONYMOUS_SESSION_HEADER = "x-assistant-ui-anonymous-session";

export function shouldUseAnonymousSessionFetch(
  chatApi: string,
  platform: string,
): boolean {
  return platform === "web" && chatApi.startsWith("http");
}

export function createAnonymousSessionFetch(
  chatApi: string,
  fetchImplementation: typeof fetch = fetch,
): typeof fetch {
  let tokenPromise: Promise<string | null> | null = null;

  const getToken = () => {
    tokenPromise ??= (async () => {
      const endpoint = new URL("/api/anonymous-session", chatApi);
      const response = await fetchImplementation(endpoint, {
        credentials: "omit",
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as { token?: unknown };
      return typeof payload.token === "string" && payload.token
        ? payload.token
        : null;
    })().catch(() => null);
    return tokenPromise;
  };

  return async (input, init) => {
    const send = async () => {
      const headers = new Headers(
        init?.headers ?? (input instanceof Request ? input.headers : undefined),
      );
      const token = await getToken();
      if (token) headers.set(ANONYMOUS_SESSION_HEADER, token);
      return fetchImplementation(input, { ...init, headers });
    };

    const response = await send();
    if (response.status !== 401) return response;
    tokenPromise = null;
    return send();
  };
}
