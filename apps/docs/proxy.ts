import { NextResponse, type NextRequest } from "next/server";
import { docsAuth } from "@/lib/accounts-auth";

/**
 * The routes that read the visitor's session. The proxy verifies the access
 * token in front of them and refreshes it within a minute of expiry, setting
 * the rotated cookies on the response and on the request the route reads.
 * Every page stays public, and signing in stays optional. `/api/auth/session`
 * refreshes the session itself, because the guard leaves `/api/auth/*` alone.
 */
const SESSION_PATHS = [
  "/api/chat",
  "/api/doc/chat",
  "/api/assistant-token",
  "/api/demo/claim",
  "/api/demo/usage",
  "/api/cloud/projects",
];

export const config = {
  matcher: [
    "/api/chat",
    "/api/doc/chat",
    "/api/assistant-token",
    "/api/demo/claim",
    "/api/demo/usage",
    "/api/cloud/projects",
    "/umami/:path*",
    "/ph/:path*",
    { source: "/changelog", has: [{ type: "query", key: "pkg" }] },
    { source: "/changelog", has: [{ type: "query", key: "page" }] },
  ],
};

/**
 * Analytics requests go to their hosts from here rather than through config
 * rewrites, so the visitor's cookies and the anonymous session header stay on
 * this site. Only the Umami tracker script and its send endpoint are served;
 * the rest of the Umami app is not.
 */
const UMAMI_ORIGIN = "https://assistant-ui-umami.vercel.app";
const UMAMI_PATHS = new Set(["/umami/script.js", "/umami/api/send"]);
const POSTHOG_ASSETS_ORIGIN = "https://us-assets.i.posthog.com";
const POSTHOG_ORIGIN = "https://us.i.posthog.com";
const STRIPPED_ANALYTICS_HEADERS = [
  "cookie",
  "authorization",
  "x-assistant-ui-anonymous-session",
];

function analyticsDestination(url: URL): URL | null | undefined {
  const { pathname, search } = url;
  let destination: URL;
  if (pathname === "/umami" || pathname.startsWith("/umami/")) {
    if (!UMAMI_PATHS.has(pathname)) return null;
    destination = new URL(pathname.slice("/umami".length), UMAMI_ORIGIN);
  } else if (pathname.startsWith("/ph/static/")) {
    destination = new URL(pathname.slice("/ph".length), POSTHOG_ASSETS_ORIGIN);
  } else if (pathname === "/ph" || pathname.startsWith("/ph/")) {
    destination = new URL(pathname.slice("/ph".length) || "/", POSTHOG_ORIGIN);
  } else {
    return undefined;
  }
  destination.search = search;
  return destination;
}

function proxyAnalytics(request: NextRequest, destination: URL) {
  const headers = new Headers(request.headers);
  for (const name of STRIPPED_ANALYTICS_HEADERS) headers.delete(name);
  return NextResponse.rewrite(destination, { request: { headers } });
}

const PACKAGE_NAME = /^(?:@[a-z0-9-]+\/)?[a-z0-9-][a-z0-9._-]*$/i;

function legacyChangelogUrl(request: NextRequest): URL {
  const { searchParams } = request.nextUrl;
  const pkg = searchParams.get("pkg") ?? "";
  const page = Number(searchParams.get("page"));
  const segments = [
    PACKAGE_NAME.test(pkg) ? pkg : null,
    Number.isInteger(page) && page > 1 ? String(page) : null,
  ].filter((s): s is string => s !== null);
  const url = request.nextUrl.clone();
  url.pathname = ["/changelog", ...segments].join("/");
  url.search = "";
  return url;
}

export async function proxy(request: NextRequest) {
  if (SESSION_PATHS.includes(request.nextUrl.pathname)) {
    const auth = docsAuth();
    return auth ? auth.proxy(request) : NextResponse.next();
  }

  if (request.nextUrl.pathname === "/changelog") {
    return NextResponse.redirect(legacyChangelogUrl(request), 308);
  }

  const destination = analyticsDestination(request.nextUrl);
  if (destination === null) {
    return new NextResponse(null, { status: 404 });
  }
  if (
    request.nextUrl.pathname === "/umami/api/send" &&
    (request.method === "GET" || request.method === "HEAD")
  ) {
    return new NextResponse(null, { status: 204 });
  }
  if (destination) return proxyAnalytics(request, destination);

  return NextResponse.next();
}
