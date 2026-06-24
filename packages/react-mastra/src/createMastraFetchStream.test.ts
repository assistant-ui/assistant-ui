import { describe, expect, it, vi } from "vitest";
import { createMastraFetchStream } from "./useMastraRuntime";

describe("createMastraFetchStream", () => {
  it("posts Mastra messages and yields SSE events", async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"event":"message/partial","data":{"id":"a1","type":"assistant","content":"hi"}}\n\n',
          ),
        );
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(body, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const stream = createMastraFetchStream({
      api: "/api/chat",
      agentId: "screening",
    });

    const events = [];
    for await (const event of await stream(
      [{ id: "u1", type: "human", content: "hello" }],
      { abortSignal: new AbortController().signal, threadId: "t1" },
    )) {
      events.push(event);
    }

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"agentId":"screening"'),
      }),
    );
    expect(events).toEqual([
      {
        event: "message/partial",
        data: { id: "a1", type: "assistant", content: "hi" },
      },
    ]);
  });
});
