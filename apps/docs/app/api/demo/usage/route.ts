import { NextResponse } from "next/server";
import { getAnonymousSession } from "@/lib/anonymous-session";
import { readDemoUsage, resolveDemoIdentity } from "@/lib/demo-usage";

export type DemoUsagePayload = {
  used: number;
  limit: number;
  remaining: number;
  resetAt: number;
  signedIn: boolean;
};

// The composer asks before the visitor types, so a spent day offers sign-in
// instead of letting them write a message the route would refuse.
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  // Only the landing demo draws on the budget and it is same-origin, so this
  // answers nothing cross-origin rather than growing a CORS surface. A client
  // without Fetch Metadata is judged on Origin instead of refused outright.
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const sameOrigin = fetchSite
    ? fetchSite === "same-origin"
    : !origin || origin === new URL(request.url).origin;
  if (!sameOrigin) {
    return new Response(null, { status: 403, headers });
  }

  const session = getAnonymousSession(request);
  const identity = await resolveDemoIdentity(session?.id ?? "unknown");
  const usage = await readDemoUsage(identity);

  const payload: DemoUsagePayload = {
    ...usage,
    signedIn: identity.signedIn,
  };
  return NextResponse.json(payload, { headers });
}
