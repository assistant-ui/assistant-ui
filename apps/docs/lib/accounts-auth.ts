import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { headers } from "@farm.js/core/headers";
import {
  type AuiJson,
  type AuthConfig,
  createAuth,
  pathMatcher,
  requestOrigin,
  resolveEnvironment,
} from "aui-auth";
import aui from "@/aui.json";

/**
 * Sign-in through accounts with aui-auth 0.2: the session is the access token
 * in `__Host-aui.at`, verified on every request, and a refresh token accounts
 * rotates. Nothing is stored here. Production is the origin client
 * `https://www.assistant-ui.com` (aui.json), proven by the Vercel deployment;
 * tokens for the registered `urn:aui:assistant-ui-demo` still verify. Previews
 * and `farm dev` sign in as `assistant-ui-demo-dev` through accounts.aui.dev.
 *
 * Signing in is optional on this site, so every page is public and only the
 * routes that read the session refresh it, through `withDocsSession`.
 */
const isApi = pathMatcher(["/api/:path*"]);

// What `withDocsSession` resolved for the route it wraps. A refreshed token is
// read by that route in the same request, as the Next proxy handed it on in the
// request's cookie header.
const routeSession = new AsyncLocalStorage<{
  cookieHeader: string;
  secure: boolean;
}>();

/** The aui-auth binding for this app: aui-auth's Web core, with no Next APIs. */
export function createDocsAuth(config: AuthConfig) {
  const core = createAuth(config);

  async function handle(request: Request): Promise<Response> {
    return (
      (await core.handle(request)) ?? new Response("Not found", { status: 404 })
    );
  }

  /**
   * What the Next proxy did in front of a session route: verifies the access
   * token, refreshes it within a minute of expiry, hands the route the rotated
   * cookies and sets them on its response. Every page is public, so a
   * signed-out visitor goes through with no session.
   */
  function withSession<Rest extends unknown[]>(
    route: (request: Request, ...rest: Rest) => Response | Promise<Response>,
  ) {
    return async (request: Request, ...rest: Rest): Promise<Response> => {
      const result = await core.guard(request, {
        isPublic: () => true,
        isApi,
      });
      if (result.kind === "respond") return result.response;
      const response = await routeSession.run(
        {
          cookieHeader: result.cookieHeader,
          secure: requestOrigin(request).startsWith("https:"),
        },
        () => route(request, ...rest),
      );
      if (result.setCookies.length === 0) return response;
      // A fetched or streamed response can carry immutable headers.
      const withCookies = new Response(response.body, response);
      for (const cookie of result.setCookies)
        withCookies.headers.append("set-cookie", cookie);
      return withCookies;
    };
  }

  /** The session of this request, or null. */
  async function session() {
    const resolved = routeSession.getStore();
    if (resolved)
      return core.sessionFromCookieHeader(
        resolved.cookieHeader,
        resolved.secure,
      );
    const requestHeaders = headers();
    const secure = (requestHeaders.get("x-forwarded-proto") ?? "")
      .split(",")
      .some((protocol) => protocol.trim() === "https");
    return core.sessionFromCookieHeader(requestHeaders.get("cookie"), secure);
  }

  return { core, GET: handle, POST: handle, withSession, auth: session };
}

export type DocsAuth = ReturnType<typeof createDocsAuth>;

let created: DocsAuth | null | undefined;

// Docs is a public site that happens to offer sign-in, so a process that
// cannot name its environment (`farm start` outside Vercel without `AUI_ENV`)
// serves every page as a signed-out visitor rather than failing.
export function docsAuth(): DocsAuth | null {
  if (created === undefined) {
    try {
      created = createDocsAuth(resolveEnvironment(aui as AuiJson));
    } catch (error) {
      console.error("[auth] sign-in is not configured", error);
      created = null;
    }
  }
  return created;
}

/** The accounts origin this process signs in through, for accounts API calls; null when sign-in is off. */
export function accountsIssuer(): string | null {
  const auth = docsAuth();
  return auth ? auth.core.issuer : null;
}

/**
 * Wraps a route that reads the session, so an expiring session is refreshed in
 * front of it. A deployment without sign-in runs the route as it is.
 */
export function withDocsSession<Rest extends unknown[]>(
  route: (request: Request, ...rest: Rest) => Response | Promise<Response>,
) {
  return (request: Request, ...rest: Rest): Promise<Response> => {
    const auth = docsAuth();
    return auth
      ? auth.withSession(route)(request, ...rest)
      : Promise.resolve(route(request, ...rest));
  };
}

/** The session of this request, or null. `withDocsSession` refreshed it already. */
export async function getSession() {
  const auth = docsAuth();
  return auth ? auth.auth() : null;
}

/** The access token of this request's session; null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  return (await getSession())?.accessToken ?? null;
}
