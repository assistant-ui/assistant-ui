import { NextResponse, type NextRequest } from "next/server";
import { accounts } from "@/lib/accounts-auth";

export type SessionPayload = {
  /** False until the deployment carries its accounts configuration. */
  enabled: boolean;
  cloudHistory: boolean;
  user: {
    name: string;
    email: string;
    image: string | null;
  } | null;
};

// The landing page is statically rendered, so the account row reads the session
// from here instead of turning the page into a dynamic render. It resolves
// rather than reads: this is the one request per visit that renders the user,
// so it is where the session is revalidated and where the cache cookie that
// keeps every other read off the store is renewed.
export async function GET(request: NextRequest) {
  const resolved = accounts
    ? await accounts.resolveSession(request).catch(() => null)
    : null;
  const session = resolved?.session ?? null;

  const payload: SessionPayload = {
    enabled: accounts !== null,
    cloudHistory: accounts !== null && Boolean(process.env.ASSISTANT_API_KEY),
    user: session
      ? {
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }
      : null,
  };

  const headers = new Headers({ "Cache-Control": "no-store" });
  for (const cookie of resolved?.cookies ?? []) {
    headers.append("set-cookie", cookie);
  }

  return NextResponse.json(payload, { headers });
}
