import { afterEach, describe, expect, it, vi } from "vitest";

const requestScope = vi.hoisted(() => ({
  cookie: "assistant-ui.www_session=marked",
  session: { user: { id: "u1" } },
  token: "token-1",
  requests: [] as Request[],
}));

// No test runs inside a Farm request, so the request headers come from a stub
// that carries a marked session cookie.
vi.mock("@farm.js/core/headers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@farm.js/core/headers")>()),
  headers: () => new Headers({ cookie: requestScope.cookie }),
}));

vi.mock("aui-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("aui-auth")>();
  return {
    ...actual,
    createAccountsAuth: (
      ...args: Parameters<typeof actual.createAccountsAuth>
    ) => ({
      ...actual.createAccountsAuth(...args),
      sessionFromRequest: async (request: Request) => {
        requestScope.requests.push(request);
        return requestScope.session;
      },
      accessTokenFromRequest: async (request: Request) => {
        requestScope.requests.push(request);
        return requestScope.token;
      },
    }),
  };
});

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

  it("reads the session and token from the current request once the deployment is configured", async () => {
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
    expect(
      requestScope.requests.map((request) => request.headers.get("cookie")),
    ).toEqual([requestScope.cookie, requestScope.cookie]);
  });
});
