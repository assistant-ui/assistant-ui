import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function tokenRequest(origin = "https://app.example") {
  return new Request("https://app.example/api/scribe-token", {
    method: "POST",
    headers: { origin },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("ElevenLabs token route", () => {
  it("rejects cross-origin browser requests before contacting ElevenLabs", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(tokenRequest("https://attacker.example"));

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed when the API key is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(tokenRequest());

    expect(response.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a non-cacheable token for same-origin requests", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "secret-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ token: "single-use-token" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(tokenRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      token: "single-use-token",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("xi-api-key")).toBe("secret-key");
  });

  it("rejects malformed provider responses", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "secret-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})));

    const response = await POST(tokenRequest());

    expect(response.status).toBe(502);
  });

  it("rejects non-JSON provider responses", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "secret-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("invalid")));

    const response = await POST(tokenRequest());

    expect(response.status).toBe(502);
  });
});
