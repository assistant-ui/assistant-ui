import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: ["/umami/api/send"],
};

export function proxy(request: NextRequest) {
  if (request.method === "GET" || request.method === "HEAD") {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.next();
}
