import { NextResponse, type NextRequest } from "next/server";
import { isAllowedRequestContext } from "./app/api/request-context";

// Refuses cross-origin calls to the thread routes, as the chat route does for itself.
export function proxy(req: NextRequest) {
  if (!isAllowedRequestContext(req)) {
    return NextResponse.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/threads/:path*" };
