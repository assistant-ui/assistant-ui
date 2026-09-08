import { NextResponse } from "next/server";
import { accounts, getSession } from "@/lib/accounts-auth";

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
// from here instead of turning the page into a dynamic render.
export async function GET() {
  const session = accounts ? await getSession().catch(() => null) : null;
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

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
