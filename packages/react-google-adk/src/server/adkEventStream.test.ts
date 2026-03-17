import { describe, it, expect, vi } from "vitest";
import { adkEventStream } from "./adkEventStream";

async function* yieldEvents(events: unknown[]) {
  for (const event of events) {
    yield event as any;
  }
}

async function readSSE(response: Response): Promise<string> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

describe("adkEventStream", () => {
  it("returns a Response with text/event-stream content-type", () => {
    const response = adkEventStream(yieldEvents([]));
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
  });

  it("returns Cache-Control: no-cache header", () => {
    const response = adkEventStream(yieldEvents([]));
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
  });

  it("emits an initial :ok SSE comment", async () => {
    const response = adkEventStream(yieldEvents([]));
    const text = await readSSE(response);
    expect(text).toMatch(/^:ok\n\n/);
  });

  it("serializes events as SSE data lines", async () => {
    const events = [
      { id: "e1", content: { parts: [{ text: "hello" }] } },
      { id: "e2", content: { parts: [{ text: "world" }] } },
    ];
    const response = adkEventStream(yieldEvents(events));
    const text = await readSSE(response);
    const lines = text.split("\n\n").filter((l) => l.startsWith("data: "));
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]!.slice(6))).toMatchObject({ id: "e1" });
    expect(JSON.parse(lines[1]!.slice(6))).toMatchObject({ id: "e2" });
  });

  it("emits an error event when the generator throws", async () => {
    // biome-ignore lint/correctness/useYield: intentionally throws before yielding
    async function* throwingGen() {
      throw new Error("Test error");
    }
    const response = adkEventStream(throwingGen() as any);
    const text = await readSSE(response);
    const lines = text.split("\n\n").filter((l) => l.startsWith("data: "));
    expect(lines).toHaveLength(1);
    const errorEvent = JSON.parse(lines[0]!.slice(6));
    expect(errorEvent).toMatchObject({
      errorCode: "STREAM_ERROR",
      errorMessage: "Test error",
    });
  });

  it("calls onError callback when the generator throws", async () => {
    const onError = vi.fn();
    // biome-ignore lint/correctness/useYield: intentionally throws before yielding
    async function* throwingGen() {
      throw new Error("Test error");
    }
    const response = adkEventStream(throwingGen() as any, { onError });
    await readSSE(response);
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
