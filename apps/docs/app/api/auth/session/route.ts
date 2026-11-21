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
// rather than reads: `withDocsSession` wraps only the routes that read the
// session, and this is the one request per visit that renders the user, so it
// is where an expiring access token is refreshed and the rotated cookies are
// set. Farm never prerenders an API route, so every visitor gets their own answer.
export async function GET(request: Request) {
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

  return Response.json(payload, { headers });
}
