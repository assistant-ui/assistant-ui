import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: "/api/pi/:path*",
};

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

const getRequestOrigin = (request: NextRequest) => {
  const host = request.headers.get("host");
  if (host === null) return undefined;

  try {
    return new URL(`${request.nextUrl.protocol}//${host}`);
  } catch {
    return undefined;
  }
};

const isAllowedRequestContext = (request: NextRequest, requestOrigin: URL) => {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null) {
    return fetchSite === "same-origin" || fetchSite === "none";
  }

  const origin = request.headers.get("origin");
  return origin === null || origin === requestOrigin.origin;
};

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  const requestOrigin = getRequestOrigin(request);
  if (
    requestOrigin === undefined ||
    !LOOPBACK_HOSTNAMES.has(requestOrigin.hostname)
  ) {
    return new NextResponse(null, { status: 403 });
  }

  if (!isAllowedRequestContext(request, requestOrigin)) {
    return new NextResponse(null, { status: 403 });
  }

  return NextResponse.next();
}
