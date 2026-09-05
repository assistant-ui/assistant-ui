import { NextResponse } from "next/server";
import { accountCloud } from "@/lib/account-cloud";
import { getSession } from "@/lib/accounts-auth";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const sameOrigin =
    fetchSite !== null
      ? fetchSite === "same-origin"
      : origin !== null && origin === new URL(request.url).origin;
  if (!sameOrigin) {
    return new Response(null, { status: 403, headers });
  }

  const session = await getSession().catch(() => null);
  if (!session) {
    return NextResponse.json(
      { error: "A signed-in session is required." },
      { status: 401, headers },
    );
  }

  const cloud = accountCloud(session.user.id);
  if (!cloud) {
    return NextResponse.json(
      { error: "Assistant Cloud account history is not configured." },
      { status: 503, headers },
    );
  }

  try {
    const { token } = await cloud.auth.tokens.create();
    return NextResponse.json({ token }, { headers });
  } catch {
    return NextResponse.json(
      { error: "Assistant Cloud could not mint an account token." },
      { status: 502, headers },
    );
  }
}
