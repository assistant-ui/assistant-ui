import { NextResponse } from "next/server";
import {
  ANONYMOUS_SESSION_COOKIE,
  ANONYMOUS_SESSION_TTL_SECONDS,
  createAnonymousSessionToken,
  getAnonymousSession,
  getAnonymousSessionSecret,
} from "@/lib/anonymous-session";
import { checkAnonymousSessionIssuanceRateLimit } from "@/lib/rate-limit";

const ALLOWED_ORIGINS = new Set([
  "https://assistant-ui-expo.vercel.app",
  "https://assistant-ui-ink.vercel.app",
  "http://localhost:8081",
]);

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  if (!ALLOWED_ORIGINS.has(origin)) return {};
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
  const headers = corsHeaders(request);
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
  const response = NextResponse.json(
    { token },
    { headers: { ...headers, "Cache-Control": "no-store" } },
  );
  response.cookies.set(ANONYMOUS_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ANONYMOUS_SESSION_TTL_SECONDS,
  });
  return response;
}
