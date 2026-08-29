import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function tokenRequest(fetchSite: string | null = "same-origin") {
  const headers = new Headers();
  if (fetchSite !== null) headers.set("sec-fetch-site", fetchSite);
  return new Request("https://app.example/api/scribe-token", {
    method: "POST",
    headers,
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ElevenLabs token route", () => {
  it.each(["same-site", "cross-site"])(
    "rejects %s browser requests before contacting ElevenLabs",
    async (fetchSite) => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const response = await POST(tokenRequest(fetchSite));

      expect(response.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    { label: "missing", fetchSite: null },
    { label: "none", fetchSite: "none" },
  ])("allows $label Fetch Metadata context", async ({ fetchSite }) => {
    vi.stubEnv("ELEVENLABS_API_KEY", "secret-key");
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValue(Response.json({ token: "single-use-token" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(tokenRequest(fetchSite));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects foreign origins when Fetch Metadata is unavailable", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("https://app.example/api/scribe-token", {
        method: "POST",
        headers: { origin: "https://attacker.example" },
      }),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts matching origins when Fetch Metadata is unavailable", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "secret-key");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ token: "single-use-token" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("https://app.example/api/scribe-token", {
        method: "POST",
        headers: { origin: "https://app.example" },
      }),
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("fails closed when the API key is missing", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "");
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

  it("rejects empty provider tokens", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "secret-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ token: " " })),
    );

    const response = await POST(tokenRequest());

    expect(response.status).toBe(502);
  });

  it("logs provider errors without exposing them to the client", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "secret-key");
    const providerResponse = new Response("invalid API key", { status: 401 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(providerResponse));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(tokenRequest());

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to create a transcription session.",
    });
    expect(providerResponse.bodyUsed).toBe(true);
    expect(errorSpy).toHaveBeenCalledWith(
      "ElevenLabs token request failed (401):",
      "invalid API key",
    );
  });

  it("rejects non-JSON provider responses", async () => {
    vi.stubEnv("ELEVENLABS_API_KEY", "secret-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("invalid")));

    const response = await POST(tokenRequest());

    expect(response.status).toBe(502);
  });
});
