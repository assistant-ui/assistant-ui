import { describe, expect, it } from "vitest";
import * as entry from "./index";

describe("assistant-transport state exports", () => {
  it("streams operations end to end through the SSE wire", async () => {
    const stream = entry.createObjectStream({
      execute: (controller) => {
        controller.enqueue([
          { type: "set", path: ["message"], value: "Hello" },
        ]);
        controller.enqueue([
          { type: "append-text", path: ["message"], value: " World" },
        ]);
      },
    });

    const response = new entry.ObjectStreamResponse(stream);
    const decoded = entry.fromObjectStreamResponse(response);

    const tracker = new entry.AssistantTransportDeltaTracker();
    const reader = decoded.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      tracker.append(value.operations);
      expect(tracker.state).toEqual(value.snapshot);
    }

    expect(tracker.state).toEqual({ message: "Hello World" });
    expect(tracker.isChangedAt(["message"])).toBe(true);
  });
});
