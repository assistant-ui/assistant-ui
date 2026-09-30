import { afterEach, describe, expect, it, vi } from "vitest";

const requestScope = vi.hoisted(() => ({
  session: { user: { id: "u1" } },
  token: "token-1",
}));

// The Next request scope reads request headers no test request carries, so a
// stub stands in for it and answers with a marked session and token.
vi.mock("aui-auth/next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("aui-auth/next")>()),
  withNextRequestScope: () => ({
    getSession: async () => requestScope.session,
    getAccessToken: async () => requestScope.token,
    updateSessionData: async () => null,
  }),
}));

const unset = {
  NEXT_PUBLIC_AUTH_URL: "",
  DOCS_OIDC_CLIENT_ID: "",
  ENCRYPTION_KEY: "",
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: "",
};

// The module builds its client from the environment at import, so each case
// loads a fresh copy under its own variables.
async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries({ ...unset, ...env })) {
    vi.stubEnv(key, value);
  }
  return import("./accounts-auth");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("accounts-auth", () => {
  it("offers no accounts, no options and no token on a deployment without an issuer", async () => {
    const auth = await load({});
    expect(auth.accounts).toBeNull();
    expect(auth.accountsOptions).toBeNull();
    expect(await auth.getSession()).toBeNull();
    expect(await auth.getAccessToken()).toBeNull();
  });

  it("names the issuer for accounts API calls as soon as the deployment has one", async () => {
    const auth = await load({ NEXT_PUBLIC_AUTH_URL: "https://accounts.test" });
    expect(auth.accountsOptions).toEqual({ issuer: "https://accounts.test" });
    expect(auth.accounts).toBeNull();
    expect(await auth.getAccessToken()).toBeNull();
  });

  it("reads the session and token through the Next request scope once the deployment is configured", async () => {
    const auth = await load({
      NEXT_PUBLIC_AUTH_URL: "https://accounts.test",
      DOCS_OIDC_CLIENT_ID: "docs",
      ENCRYPTION_KEY: "0123456789abcdef".repeat(4),
      NODE_ENV: "development",
    });
    expect(auth.accounts).not.toBeNull();
    expect(auth.accountsOptions).toEqual({ issuer: "https://accounts.test" });
    expect(await auth.getSession()).toBe(requestScope.session);
    expect(await auth.getAccessToken()).toBe(requestScope.token);
  });
});
