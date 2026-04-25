import { describe, expect, it } from "vitest";

import { createHeadlessAdapter } from "../adapter/headless";

describe("createHeadlessAdapter", () => {
  it("records sent user messages and emitted events in order", async () => {
    const adapter = createHeadlessAdapter();

    await adapter.sendUserMessage([{ type: "text", text: "hi" }]);
    await adapter.emit({ type: "text-delta", delta: "Hel" });
    await adapter.emit({ type: "text-delta", delta: "lo" });
    await adapter.emit({ type: "finish", reason: "stop" });

    expect(adapter.getSnapshot()).toEqual({
      userMessages: [[{ type: "text", text: "hi" }]],
      events: [
        { type: "text-delta", delta: "Hel" },
        { type: "text-delta", delta: "lo" },
        { type: "finish", reason: "stop" },
      ],
      abortCount: 0,
    });
  });

  it("abort() increments abortCount", async () => {
    const adapter = createHeadlessAdapter();
    await adapter.abort();
    await adapter.abort();
    expect(adapter.getSnapshot().abortCount).toBe(2);
  });

  it("getSnapshot returns a defensive copy", async () => {
    const adapter = createHeadlessAdapter();
    await adapter.emit({ type: "disconnect" });
    const first = adapter.getSnapshot();
    await adapter.emit({ type: "finish", reason: "abort" });
    const second = adapter.getSnapshot();
    expect(first.events).toHaveLength(1);
    expect(second.events).toHaveLength(2);
  });
});
