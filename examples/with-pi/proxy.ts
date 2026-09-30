import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: "/api/pi/:path*",
};

const isAllowedRequestContext = (request: NextRequest) => {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null) {
    return fetchSite === "same-origin" || fetchSite === "none";
  }

  const origin = request.headers.get("origin");
  return origin === null || origin === request.nextUrl.origin;
};

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  if (!isAllowedRequestContext(request)) {
    return new NextResponse(null, { status: 403 });
  }

  return NextResponse.next();
}
