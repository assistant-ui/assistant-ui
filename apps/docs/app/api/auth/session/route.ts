import { connection, NextResponse, type NextRequest } from "next/server";
import { docsAuth } from "@/lib/accounts-auth";
import { analyticsIdFor } from "@/lib/analytics-id";
import { setupCorsHeaders } from "@/lib/setup-origin";

export type SessionPayload = {
  /** False until the deployment carries its accounts configuration. */
  enabled: boolean;
  cloudHistory: boolean;
  user: {
    analyticsId: string | null;
    name: string;
    email: string;
    image: string | null;
  } | null;
};

// The landing page is statically rendered, so the account row reads the session
// from here instead of turning the page into a dynamic render. It resolves
// rather than reads: the proxy leaves `/api/auth/*` alone, and this is the one
// request per visit that renders the user, so it is where an expiring access
// token is refreshed and the rotated cookies are set.
export async function GET(request: NextRequest) {
  // A prerendered response would freeze one visitor's answer for everyone.
  await connection();
  const auth = docsAuth();
  const resolved = auth
    ? await auth.core.resolve(request).catch(() => null)
    : null;
  const session = resolved?.session ?? null;

  const payload: SessionPayload = {
    enabled: auth !== null,
    cloudHistory: auth !== null && Boolean(process.env.ASSISTANT_API_KEY),
    user: session
      ? {
          analyticsId: analyticsIdFor(session.user.id),
          name: session.user.name ?? session.user.email ?? "",
          email: session.user.email ?? "",
          image: session.user.image,
        }
      : null,
  };

  const headers = new Headers({
    "Cache-Control": "no-store",
    ...setupCorsHeaders(request),
  });
  for (const cookie of resolved?.setCookies ?? []) {
    headers.append("set-cookie", cookie);
  }

  return NextResponse.json(payload, { headers });
}
