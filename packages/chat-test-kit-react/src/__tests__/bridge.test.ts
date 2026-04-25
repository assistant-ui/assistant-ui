import type { AssistantEvent } from "@assistant-ui/chat-test-kit-core";
import { describe, expect, it } from "vitest";
import { EventBridge } from "../harness/bridge";

describe("EventBridge", () => {
  it("delivers pushed events to a consumer in order", async () => {
    const bridge = new EventBridge();
    const events: AssistantEvent[] = [
      { type: "text-delta", delta: "Hel" },
      { type: "text-delta", delta: "lo" },
      { type: "finish", reason: "stop" },
    ];

    const consumer = (async () => {
      const out: AssistantEvent[] = [];
      for await (const event of bridge.consume()) out.push(event);
      return out;
    })();

    for (const event of events) bridge.push(event);
    bridge.end();

    expect(await consumer).toEqual(events);
  });

  it("buffers events pushed before consume() starts", async () => {
    const bridge = new EventBridge();
    bridge.push({ type: "text-delta", delta: "early" });
    bridge.end();

    const out: AssistantEvent[] = [];
    for await (const event of bridge.consume()) out.push(event);

    expect(out).toEqual([{ type: "text-delta", delta: "early" }]);
  });

  it("can be reset for a new run", async () => {
    const bridge = new EventBridge();
    bridge.push({ type: "text-delta", delta: "a" });
    bridge.end();

    const first: AssistantEvent[] = [];
    for await (const event of bridge.consume()) first.push(event);

    bridge.reset();
    bridge.push({ type: "text-delta", delta: "b" });
    bridge.end();

    const second: AssistantEvent[] = [];
    for await (const event of bridge.consume()) second.push(event);

    expect(first.map((event) => (event as { delta: string }).delta)).toEqual([
      "a",
    ]);
    expect(second.map((event) => (event as { delta: string }).delta)).toEqual([
      "b",
    ]);
  });
});
