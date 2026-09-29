import { afterEach, describe, expect, it, vi } from "vitest";

// The Next request scope reads request headers, which no test request carries.
vi.mock("aui-auth/next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("aui-auth/next")>()),
  withNextRequestScope: () => ({
    getSession: async () => null,
    getAccessToken: async () => null,
    updateSessionData: async () => null,
  }),
}));

// The module builds its client from the environment at import, so each case
// loads a fresh copy under its own variables.
async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const key of [
    "NEXT_PUBLIC_AUTH_URL",
    "DOCS_OIDC_CLIENT_ID",
    "ENCRYPTION_KEY",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
  ]) {
    vi.stubEnv(key, env[key] ?? "");
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
});
