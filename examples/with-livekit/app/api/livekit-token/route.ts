import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const roomName = process.env.LIVEKIT_ROOM_NAME ?? "assistant-room";

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set" },
      { status: 500 },
    );
  }

  const participantIdentity = `user-${Date.now()}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();

  return NextResponse.json({ token });
}
