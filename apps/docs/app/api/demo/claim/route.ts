import { NextResponse } from "next/server";
import { accountCloud } from "@/lib/account-cloud";
import { getSession } from "@/lib/accounts-auth";
import { getAnonymousSession } from "@/lib/anonymous-session";
import { mergeConversations } from "@/lib/demo-usage";

export async function POST(request: Request) {
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

  const body: unknown = await request.json().catch(() => null);
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body) ||
    typeof (body as { refresh_token?: unknown }).refresh_token !== "string" ||
    (body as { refresh_token: string }).refresh_token.length === 0
  ) {
    return NextResponse.json(
      { error: "A refresh_token string is required." },
      { status: 400, headers },
    );
  }

  const cloud = accountCloud(session.user.id);
  if (!cloud) {
    return NextResponse.json(
      { error: "Assistant Cloud account history is not configured." },
      { status: 503, headers },
    );
  }

  let moved: number;
  try {
    ({ moved } = await cloud.threads.claim({
      refresh_token: (body as { refresh_token: string }).refresh_token,
    }));
  } catch {
    return NextResponse.json(
      { error: "Assistant Cloud could not claim the anonymous threads." },
      { status: 502, headers },
    );
  }

  const anonymousSession = getAnonymousSession(request);
  if (anonymousSession) {
    await mergeConversations(
      `anon:${anonymousSession.id}`,
      `user:${session.user.id}`,
    );
  }

  return NextResponse.json({ moved }, { headers });
}
