import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

type LiveKitClaims = {
  exp: number;
  nbf: number;
  sub: string;
  video: {
    canPublish: boolean;
    canSubscribe: boolean;
    room: string;
    roomJoin: boolean;
  };
};

function decodeClaims(token: string): LiveKitClaims {
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Token payload is missing");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
}

async function createToken() {
  const response = await POST(
    new Request("https://app.example/api/livekit-token", {
      method: "POST",
      headers: { "sec-fetch-site": "same-origin" },
    }),
  );
  const body = (await response.json()) as { token: string };
  return { response, claims: decodeClaims(body.token) };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("LiveKit token route", () => {
  it("rejects cross-site browser requests", async () => {
    const response = await POST(
      new Request("https://app.example/api/livekit-token", {
        method: "POST",
        headers: { "sec-fetch-site": "cross-site" },
      }),
    );

    expect(response.status).toBe(403);
  });

  it("rejects foreign origins when Fetch Metadata is unavailable", async () => {
    const response = await POST(
      new Request("https://app.example/api/livekit-token", {
        method: "POST",
        headers: { origin: "https://attacker.example" },
      }),
    );

    expect(response.status).toBe(403);
  });

  it("accepts matching origins when Fetch Metadata is unavailable", async () => {
    vi.stubEnv("LIVEKIT_API_KEY", "api-key");
    vi.stubEnv("LIVEKIT_API_SECRET", "secret-key-that-is-long-enough");

    const response = await POST(
      new Request("https://app.example/api/livekit-token", {
        method: "POST",
        headers: { origin: "https://app.example" },
      }),
    );

    expect(response.status).toBe(200);
  });

  it("issues short-lived tokens for isolated rooms", async () => {
    vi.stubEnv("LIVEKIT_API_KEY", "api-key");
    vi.stubEnv("LIVEKIT_API_SECRET", "secret-key-that-is-long-enough");
    vi.stubEnv("LIVEKIT_ROOM_NAME", "assistant-room");

    const first = await createToken();
    const second = await createToken();

    expect(first.response.status).toBe(200);
    expect(first.response.headers.get("cache-control")).toBe("no-store");
    expect(first.claims.exp - first.claims.nbf).toBe(600);
    expect(first.claims.sub).toMatch(/^user-[0-9a-f-]{36}$/);
    expect(first.claims.video).toMatchObject({
      canPublish: true,
      canSubscribe: true,
      roomJoin: true,
    });
    expect(first.claims.video.room).toMatch(/^assistant-room-[0-9a-f-]{36}$/);
    expect(second.claims.sub).not.toBe(first.claims.sub);
    expect(second.claims.video.room).not.toBe(first.claims.video.room);
  });

  it("fails closed when the server credentials are missing", async () => {
    vi.stubEnv("LIVEKIT_API_KEY", "");
    vi.stubEnv("LIVEKIT_API_SECRET", "");

    const response = await POST(
      new Request("https://app.example/api/livekit-token", {
        method: "POST",
        headers: { "sec-fetch-site": "same-origin" },
      }),
    );

    expect(response.status).toBe(500);
  });
});
