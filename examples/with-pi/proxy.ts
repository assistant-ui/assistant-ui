import { NextResponse, type NextRequest } from "next/server";
import { getPiRequestRejection } from "./lib/pi-request-guard";

export const config = {
  matcher: "/api/pi/:path*",
};

export function proxy(request: NextRequest) {
  return getPiRequestRejection(request) ?? NextResponse.next();
}
