import type {
  AssistantEvent,
  ContentPart,
} from "@assistant-ui/chat-test-kit-core";
import { describe, expect, it } from "vitest";
import { createAssistantUIAdapter } from "../harness/adapter";
import { EventBridge } from "../harness/bridge";

describe("createAssistantUIAdapter", () => {
  it("records sendUserMessage in snapshot.userMessages and timeline", async () => {
    const bridge = new EventBridge();
    const adapter = createAssistantUIAdapter({ bridge });
    const content: ContentPart[] = [{ type: "text", text: "hi" }];

    await adapter.sendUserMessage(content);

    expect(adapter.getSnapshot().userMessages).toEqual([content]);
    expect(adapter.timeline()).toEqual([
      { kind: "user-submit", at: expect.any(Number), content: "hi" },
    ]);
  });

  it("forwards emitted events to the bridge AND records them in snapshot/timeline", async () => {
    const bridge = new EventBridge();
    const adapter = createAssistantUIAdapter({ bridge });

    const event: AssistantEvent = { type: "text-delta", delta: "Hel" };
    await adapter.emit(event);

    expect(adapter.getSnapshot().events).toEqual([event]);
    expect(adapter.timeline()[0]).toMatchObject({ kind: "event", event });
  });

  it("abort calls onAbort once and increments abortCount", async () => {
    const bridge = new EventBridge();
    let aborts = 0;
    const adapter = createAssistantUIAdapter({
      bridge,
      onAbort: () => {
        aborts += 1;
      },
    });

    await adapter.abort();
    await adapter.abort();

    expect(aborts).toBe(2);
    expect(adapter.getSnapshot().abortCount).toBe(2);
  });

  it("ending the bridge after a finish event is the adapter's responsibility", async () => {
    const bridge = new EventBridge();
    const adapter = createAssistantUIAdapter({ bridge });

    await adapter.emit({ type: "finish", reason: "stop" });

    const out = [];
    for await (const event of bridge.consume()) out.push(event);
    expect(out).toEqual([{ type: "finish", reason: "stop" }]);
  });
});
