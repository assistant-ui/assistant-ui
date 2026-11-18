import { afterEach, describe, expect, it, vi } from "vitest";

type Headers = Record<string, string>;

const unparsableRequest = (headers: Headers) =>
  new Request("https://app.example/api/chat", {
    method: "POST",
    headers,
    body: "not json",
  });

const chatRequest = (headers: Headers) =>
  new Request("https://app.example/api/chat", {
    method: "POST",
    headers,
    body: JSON.stringify({
      messages: [
        {
          id: "user-1",
          role: "user",
          parts: [{ type: "text", text: "Hello" }],
        },
      ],
      tools: {},
    }),
  });

export function describeRequestContext(
  name: string,
  POST: (request: Request) => Promise<Response>,
) {
  describe(name, () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    });

    it.each<{ label: string; headers: Headers }>([
      {
        label: "a same-site browser request",
        headers: { "sec-fetch-site": "same-site" },
      },
      {
        label: "a cross-site browser request",
        headers: { "sec-fetch-site": "cross-site" },
      },
      {
        label: "a foreign Origin",
        headers: { origin: "https://evil.example" },
      },
      { label: "an unparsable Origin", headers: { origin: "not a url" } },
    ])("refuses $label before calling the model", async ({ headers }) => {
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const response = await POST(unparsableRequest(headers));

      expect(response.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each<{ label: string; headers: Headers }>([
      { label: "same-origin", headers: { "sec-fetch-site": "same-origin" } },
      { label: "none", headers: { "sec-fetch-site": "none" } },
      { label: "matching Origin", headers: { origin: "https://app.example" } },
      { label: "no browser headers", headers: {} },
    ])("serves $label requests", async ({ headers }) => {
      vi.stubEnv("OPENAI_API_KEY", "test-key");
      vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: { message: "test model" } }, { status: 400 }),
        );
      vi.stubGlobal("fetch", fetchMock);

      const response = await POST(chatRequest(headers));
      await response.text();

      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalled();
    });
  });
}
