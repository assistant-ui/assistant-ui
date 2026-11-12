import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: [
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

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/changelog") {
    return NextResponse.redirect(legacyChangelogUrl(request), 308);
  }

  if (request.method === "GET" || request.method === "HEAD") {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.next();
}
