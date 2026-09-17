import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/umami/api/send", "/changelog"],
};

function legacyChangelogUrl(request: NextRequest): URL | null {
  const { searchParams } = request.nextUrl;
  const pkg = searchParams.get("pkg");
  const page = searchParams.get("page");
  if (pkg === null && page === null) return null;
  const segments = [pkg, page && Number(page) > 1 ? page : null].filter(
    (s): s is string => s !== null,
  );
  const url = request.nextUrl.clone();
  url.pathname = ["/changelog", ...segments].join("/");
  url.search = "";
  return url;
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/changelog") {
    const target = legacyChangelogUrl(request);
    return target ? NextResponse.redirect(target, 308) : NextResponse.next();
  }

  if (request.method === "GET" || request.method === "HEAD") {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.next();
}
