import { describe, expect, it, vi } from "vitest";
import { createXuluxChatFetch, getXuluxSuggestionId } from "./xulux-chat-fetch";

describe("xulux chat fetch", () => {
  it("reads the suggestion id from run metadata", () => {
    expect(
      getXuluxSuggestionId(
        JSON.stringify({
          metadata: {
            custom: { xuluxSuggestionId: "learn-thread-component" },
          },
        }),
      ),
    ).toBe("learn-thread-component");
  });

  it("ignores normal and malformed request bodies", () => {
    expect(getXuluxSuggestionId(JSON.stringify({ metadata: {} }))).toBeNull();
    expect(getXuluxSuggestionId("not json")).toBeNull();
    expect(getXuluxSuggestionId(undefined)).toBeNull();
  });

  it("returns a replay without calling the network", async () => {
    const networkFetch = vi.fn<typeof fetch>();
    const chatFetch = createXuluxChatFetch(networkFetch);
    const response = await chatFetch("/api/xulux/chat", {
      method: "POST",
      body: JSON.stringify({
        metadata: {
          custom: { xuluxSuggestionId: "learn-thread-component" },
        },
      }),
    });
    expect(networkFetch).not.toHaveBeenCalled();
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    await response.body?.cancel();
  });

  it("falls through for normal and unknown suggestion requests", async () => {
    const networkFetch = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response("network"));
    const chatFetch = createXuluxChatFetch(networkFetch);

    const normal = await chatFetch("/api/xulux/chat", {
      method: "POST",
      body: JSON.stringify({ metadata: {} }),
    });
    const unknown = await chatFetch("/api/xulux/chat", {
      method: "POST",
      body: JSON.stringify({
        metadata: { custom: { xuluxSuggestionId: "unknown" } },
      }),
    });

    expect(await normal.text()).toBe("network");
    expect(await unknown.text()).toBe("network");
    expect(networkFetch).toHaveBeenCalledTimes(2);
  });
});
