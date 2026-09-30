import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: "/api/pi/:path*",
};

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

const isAllowedRequestContext = (request: NextRequest) => {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null) {
    return fetchSite === "same-origin" || fetchSite === "none";
  }

  const origin = request.headers.get("origin");
  return origin === null || origin === request.nextUrl.origin;
};

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  if (!LOOPBACK_HOSTNAMES.has(request.nextUrl.hostname)) {
    return new NextResponse(null, { status: 403 });
  }

  if (!isAllowedRequestContext(request)) {
    return new NextResponse(null, { status: 403 });
  }

  return NextResponse.next();
}
