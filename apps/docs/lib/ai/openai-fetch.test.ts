import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOpenAI } from "./openai-fetch";

afterEach(() => vi.unstubAllGlobals());

const endpoint = "https://gateway.test/v1/chat/completions";
const completion = {
  choices: [{ index: 0, message: { content: "A follow-up" } }],
};

describe("fetchOpenAI", () => {
  it("unwraps successful completions and retains response metadata with corrected body headers", async () => {
    const response = Response.json(
      { success: true, data: completion },
      {
        status: 201,
        statusText: "Created",
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-length": "999",
          "content-encoding": "gzip",
          "x-request-id": "request-123",
        },
      },
    );
    const fetch = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetch);
    const signal = new AbortController().signal;
    const input = new Request(endpoint, { method: "POST" });
    const init = { body: "original request body", signal };

    const result = await fetchOpenAI(input, init);

    expect(await result.json()).toEqual(completion);
    expect(result.status).toBe(201);
    expect(result.statusText).toBe("Created");
    expect(result.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(result.headers.get("x-request-id")).toBe("request-123");
    expect(result.headers.has("content-length")).toBe(false);
    expect(result.headers.has("content-encoding")).toBe(false);
    expect(fetch).toHaveBeenCalledWith(input, init);
  });

  it.each([
    ["conventional completion", endpoint, () => Response.json(completion)],
    [
      "Responses API",
      "https://gateway.test/v1/responses",
      () => Response.json({ success: true, data: completion }),
    ],
    [
      "HTTP error",
      endpoint,
      () => Response.json({ success: true, data: completion }, { status: 400 }),
    ],
    [
      "event stream",
      endpoint,
      () =>
        new Response('data: {"choices":[]}\n\ndata: [DONE]\n\n', {
          headers: { "content-type": "text/event-stream" },
        }),
    ],
    [
      "invalid JSON",
      endpoint,
      () =>
        new Response("{invalid", {
          headers: { "content-type": "application/json" },
        }),
    ],
    ["null JSON", endpoint, () => Response.json(null)],
    [
      "failed envelope",
      endpoint,
      () => Response.json({ success: false, data: completion }),
    ],
  ])(
    "passes through a %s response with its body intact",
    async (_name, url, createResponse) => {
      const response = createResponse();
      const originalText = await response.clone().text();
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

      const result = await fetchOpenAI(url);

      expect(result).toBe(response);
      expect(result.bodyUsed).toBe(false);
      expect(await result.text()).toBe(originalText);
    },
  );

  it("does not read a streaming response before returning it", async () => {
    const response = new Response(new ReadableStream(), {
      headers: { "content-type": "text/event-stream" },
    });
    const clone = vi.spyOn(response, "clone");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    expect(await fetchOpenAI(endpoint)).toBe(response);
    expect(clone).not.toHaveBeenCalled();
    await response.body?.cancel();
  });
});
