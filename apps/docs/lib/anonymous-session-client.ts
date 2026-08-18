let sessionPromise: Promise<void> | null = null;

export function ensureAnonymousSession(): Promise<void> {
  sessionPromise ??= fetch("/api/anonymous-session", {
    cache: "no-store",
    credentials: "same-origin",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("Unable to start an anonymous session");
      }
    })
    .catch((error: unknown) => {
      sessionPromise = null;
      throw error;
    });
  return sessionPromise;
}

export const anonymousSessionFetch: typeof fetch = async (input, init) => {
  await ensureAnonymousSession();
  const response = await fetch(input, init);
  if (response.status !== 401) return response;

  sessionPromise = null;
  await ensureAnonymousSession();
  return fetch(input, init);
};
