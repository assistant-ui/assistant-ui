import { applySetCookies, type AuiJson, resolveEnvironment } from "aui-auth";
import { createNextAuth } from "aui-auth/next";
import { createLocalIssuer } from "aui-auth/testing";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import aui from "@/aui.json";

/**
 * Production signs in as the origin client https://www.assistant-ui.com and
 * still accepts tokens for the registered urn:aui:assistant-ui-demo. The real
 * aui-auth binding, with the production environment resolved from aui.json
 * and only the issuer swapped for a local one.
 */
const ORIGIN = "https://www.assistant-ui.com";
const production = resolveEnvironment(aui as AuiJson, {
  VERCEL_ENV: "production",
});

async function setup() {
  const issuer = await createLocalIssuer();
  const proofs: string[] = [];
  const registrations: Record<string, unknown>[] = [];
  const auth = createNextAuth(
    {
      ...production,
      issuer: issuer.issuer,
      sleep: async () => {},
      clientAssertion: async (endpoint) => {
        proofs.push(endpoint);
        return { type: "workload", assertion: "vercel-oidc" };
      },
      fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).endsWith("/api/auth/origin-client")) {
          registrations.push(JSON.parse(String(init?.body)));
          return Response.json({ client_id: ORIGIN });
        }
        return issuer.fetch(input, init);
      }) as typeof fetch,
    },
    { public: ["/:path*"] },
  );
  let jar = "";
  const request = (path: string, init: RequestInit = {}) =>
    new NextRequest(new URL(path, ORIGIN), {
      ...init,
      headers: { cookie: jar, ...(init.headers as Record<string, string>) },
    } as ConstructorParameters<typeof NextRequest>[1]);
  const take = (response: Response) => {
    jar = applySetCookies(jar, response.headers.getSetCookie());
    return response;
  };
  async function signIn() {
    const login = take(await auth.GET(request("/api/auth/login?return=/docs")));
    const callback = issuer.authorize(login.headers.get("location")!, {
      sub: "acct-1",
      claims: { sid: "s1", email: "a@b.c", name: "Ada" },
    });
    const done = take(await auth.GET(request(callback)));
    return { login, done };
  }
  const session = () =>
    auth.core.sessionFromCookieHeader(jar, true).then((s) => s?.user ?? null);
  return {
    issuer,
    auth,
    proofs,
    registrations,
    request,
    signIn,
    session,
    jar: () => jar,
  };
}

describe("origin client", () => {
  it("resolves production to the origin, keeping the registered audience and its settings", () => {
    expect(production).toMatchObject({
      issuer: "https://accounts.assistant-ui.com",
      clientId: ORIGIN,
      audience: ORIGIN,
      previousAudiences: ["urn:aui:assistant-ui-demo"],
      settings: { name: "assistant-ui", orgApi: "read", listed: true },
    });
  });

  it("keeps previews and laptops on the registered dev client", () => {
    for (const env of [{ VERCEL_ENV: "preview" }, {}]) {
      expect(resolveEnvironment(aui as AuiJson, env)).toMatchObject({
        clientId: "assistant-ui-demo-dev",
        issuer: "https://accounts.aui.dev",
      });
    }
  });

  it("signs in round trip: proves the origin, redirects with the origin as client id, lands on the return path", async () => {
    const { signIn, session, proofs, registrations } = await setup();
    const { login, done } = await signIn();

    const authorize = new URL(login.headers.get("location")!);
    expect(authorize.pathname).toBe("/api/auth/oauth2/authorize");
    expect(authorize.searchParams.get("client_id")).toBe(ORIGIN);
    expect(authorize.searchParams.get("redirect_uri")).toBe(
      `${ORIGIN}/api/auth/callback`,
    );
    expect(registrations[0]).toMatchObject({
      client_id: ORIGIN,
      settings: { orgApi: "read" },
    });
    expect(proofs.some((p) => p.endsWith("/oauth2/token"))).toBe(true);
    expect(done.headers.get("location")).toBe(`${ORIGIN}/docs`);
    expect(await session()).toMatchObject({ id: "acct-1", email: "a@b.c" });
  });

  it("lets a signed-out visitor through the proxy on a session route, with no session", async () => {
    const { auth, request, session } = await setup();
    const response = await auth.proxy(request("/api/chat", { method: "POST" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(await session()).toBeNull();
  });

  it("refreshes an expiring session in the proxy and hands the route the new token", async () => {
    const { auth, issuer, request, signIn, jar } = await setup();
    await signIn();
    const before = issuer.requests.length;
    // A cookie whose token is about to expire is what the proxy refreshes.
    const expiring = await issuer.mintAccessToken(
      { sub: "acct-1", clientId: ORIGIN, sid: "s1" },
      { expiresIn: 30 },
    );
    const response = await auth.proxy(
      request("/api/chat", {
        headers: {
          cookie: jar().replace(
            /__Host-aui\.at=[^;]*/,
            `__Host-aui.at=${expiring}`,
          ),
        },
      }),
    );

    expect(issuer.requests.length).toBeGreaterThan(before);
    expect(
      response.headers
        .getSetCookie()
        .some((c) => c.startsWith("__Host-aui.at=")),
    ).toBe(true);
  });

  it("only signs out on a POST", async () => {
    const { auth, request } = await setup();
    expect((await auth.GET(request("/api/auth/logout"))).status).toBe(405);
  });

  it("accepts a token for the origin and one for urn:aui:assistant-ui-demo, and refuses another app's", async () => {
    const { auth, issuer } = await setup();
    const userFor = async (audience: string) => {
      const token = await issuer.mintAccessToken(
        { sub: "acct-1", clientId: ORIGIN, sid: "s1" },
        { audience },
      );
      return (
        await auth.core.sessionFromCookieHeader(`__Host-aui.at=${token}`, true)
      )?.user.id;
    };
    expect(await userFor(ORIGIN)).toBe("acct-1");
    expect(await userFor("urn:aui:assistant-ui-demo")).toBe("acct-1");
    expect(await userFor("urn:aui:other-app")).toBeUndefined();
  });
});

describe("docsAuth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("signs in as the dev client on a laptop", async () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("AUI_ENV", "");
    const { docsAuth, accountsIssuer } = await import("./accounts-auth");
    expect(docsAuth()?.core.clientId).toBe("assistant-ui-demo-dev");
    expect(accountsIssuer()).toBe("https://accounts.aui.dev");
  });

  it("serves everyone signed out where the process cannot name its environment", async () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("AUI_ENV", "");
    vi.stubEnv("NODE_ENV", "production");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { docsAuth, accountsIssuer, getSession } =
      await import("./accounts-auth");
    expect(docsAuth()).toBeNull();
    expect(accountsIssuer()).toBeNull();
    expect(await getSession()).toBeNull();
    error.mockRestore();
  });
});
