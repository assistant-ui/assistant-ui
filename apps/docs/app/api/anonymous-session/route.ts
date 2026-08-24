import { NextResponse } from "next/server";
import {
  ANONYMOUS_SESSION_COOKIE,
  ANONYMOUS_SESSION_TTL_SECONDS,
  createAnonymousSessionToken,
  getAnonymousSession,
  getAnonymousSessionSecret,
  isAllowedPublicAssistantOrigin,
  isPublicAssistantBrowserRequest,
} from "@/lib/anonymous-session";
import { checkAnonymousSessionIssuanceRateLimit } from "@/lib/rate-limit";

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  if (!isAllowedPublicAssistantOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "X-Assistant-UI-Anonymous-Session",
    Vary: "Origin",
  };
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: Request) {
  const headers = {
    ...corsHeaders(request),
    "Cache-Control": "no-store",
  };
  if (!isPublicAssistantBrowserRequest(request)) {
    return Response.json(
      { error: "Anonymous sessions are issued through the website." },
      { status: 403, headers },
    );
  }
  if (getAnonymousSession(request)) {
    return new Response(null, { status: 204, headers });
  }

  const secret = getAnonymousSessionSecret();
  if (!secret) {
    return Response.json(
      { error: "Anonymous session protection is not configured." },
      { status: 503, headers },
    );
  }

  const rateLimitResponse =
    await checkAnonymousSessionIssuanceRateLimit(request);
  if (rateLimitResponse) {
    for (const [key, value] of Object.entries(headers)) {
      rateLimitResponse.headers.set(key, value);
    }
    return rateLimitResponse;
  }

  const token = createAnonymousSessionToken({ secret });
  const requestOrigin = new URL(request.url).origin;
  const callerOrigin = request.headers.get("origin");
  if (callerOrigin && callerOrigin !== requestOrigin) {
    return NextResponse.json({ token }, { headers });
  }

  const response = new NextResponse(null, { status: 204, headers });
  response.cookies.set(ANONYMOUS_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ANONYMOUS_SESSION_TTL_SECONDS,
  });
  return response;
}
