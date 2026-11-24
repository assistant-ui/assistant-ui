import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/guest";

const YEAR = 60 * 60 * 24 * 365;

/*
 * Gives a browser without a session a new one. The id is also written into
 * this request's cookies, so the very first page already renders its guest.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const sessionId = crypto.randomUUID();
  request.cookies.set(SESSION_COOKIE, sessionId);
  const response = NextResponse.next({
    request: { headers: request.headers },
  });
  response.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: YEAR,
    path: "/",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
