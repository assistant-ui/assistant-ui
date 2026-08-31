import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

const TOKEN_TTL = "10m";

function isAllowedRequestContext(req: Request) {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite !== null) {
    return fetchSite === "same-origin" || fetchSite === "none";
  }

  const origin = req.headers.get("origin");
  if (origin === null) return true;

  try {
    return new URL(origin).origin === new URL(req.url).origin;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!isAllowedRequestContext(req)) {
    return NextResponse.json(
      { error: "Cross-origin requests are not allowed." },
      { status: 403 },
    );
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set" },
      { status: 500 },
    );
  }

  const participantIdentity = `user-${crypto.randomUUID()}`;
  const roomPrefix = process.env.LIVEKIT_ROOM_NAME?.trim() || "assistant-room";
  const roomName = `${roomPrefix}-${crypto.randomUUID()}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    ttl: TOKEN_TTL,
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();

  return NextResponse.json(
    { token },
    { headers: { "Cache-Control": "no-store" } },
  );
}
