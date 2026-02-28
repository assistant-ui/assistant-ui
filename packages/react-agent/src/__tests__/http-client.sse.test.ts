import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpAgentClient } from "../sdk/HttpAgentClient";
import type { SDKEvent } from "../runtime";

function createSSEStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

describe("HttpAgentClient SSE", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reconnects with Last-Event-ID and replays missing events", async () => {
    const firstConnection = new Response(
      createSSEStream([
        'id: 1\ndata: {"type":"task_started","taskId":"task-1","data":{"ok":true},"timestamp":"2026-02-28T00:00:00.000Z"}\n\n',
      ]),
      { status: 200 },
    );

    const secondConnection = new Response(
      createSSEStream([
        'id: 2\ndata: {"type":"task_completed","taskId":"task-1","data":{"totalCost":1},"timestamp":"2026-02-28T00:00:01.000Z"}\n\n',
        "data: [DONE]\n\n",
      ]),
      { status: 200 },
    );

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(firstConnection)
      .mockResolvedValueOnce(secondConnection);
    vi.stubGlobal("fetch", fetchMock);

    const client = new HttpAgentClient({
      apiKey: "test-key",
      baseUrl: "/api/agent",
    });

    const events: SDKEvent[] = [];
    for await (const event of client.streamEvents("task-1")) {
      events.push(event);
    }

    expect(events).toHaveLength(2);
    expect(events[0]?.type).toBe("task_started");
    expect(events[1]?.type).toBe("task_completed");
    expect(events[0]?.timestamp).toBeInstanceOf(Date);
    expect(events[1]?.timestamp).toBeInstanceOf(Date);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const secondCallOptions = fetchMock.mock.calls[1]?.[1] as {
      headers: Record<string, string>;
    };
    expect(secondCallOptions.headers["Last-Event-ID"]).toBe("1");
  });
});
