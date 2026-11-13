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
    "/umami/api/send",
    { source: "/changelog", has: [{ type: "query", key: "pkg" }] },
    { source: "/changelog", has: [{ type: "query", key: "page" }] },
  ],
};

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

  if (request.method === "GET" || request.method === "HEAD") {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.next();
}
