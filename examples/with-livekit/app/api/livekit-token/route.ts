import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

const TOKEN_TTL = "10m";

type OriginCheck = "allowed" | "forbidden" | "misconfigured";

function checkRequestOrigin(req: Request): OriginCheck {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite !== null) {
    return fetchSite === "same-origin" || fetchSite === "none"
      ? "allowed"
      : "forbidden";
  }

  const origin = req.headers.get("origin");
  if (origin === null) return "allowed";

  const configuredOrigin = process.env.APP_ORIGIN?.trim();
  let expectedOrigin = new URL(req.url).origin;
  if (configuredOrigin) {
    try {
      const url = new URL(configuredOrigin);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return "misconfigured";
      }
      expectedOrigin = url.origin;
    } catch {
      return "misconfigured";
    }
  }

  try {
    return new URL(origin).origin === expectedOrigin ? "allowed" : "forbidden";
  } catch {
    return "forbidden";
  }
}

export async function POST(req: Request) {
  const originCheck = checkRequestOrigin(req);
  if (originCheck === "misconfigured") {
    return NextResponse.json(
      { error: "APP_ORIGIN must be an absolute HTTP(S) origin." },
      { status: 500 },
    );
  }
  if (originCheck === "forbidden") {
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
