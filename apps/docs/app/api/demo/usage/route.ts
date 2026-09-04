import { NextResponse } from "next/server";
import {
  getAnonymousSession,
  isPublicAssistantBrowserRequest,
} from "@/lib/anonymous-session";
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
  if (!isPublicAssistantBrowserRequest(request)) {
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
