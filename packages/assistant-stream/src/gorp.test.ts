import { describe, expect, it } from "vitest";
import * as entry from "./index";

describe("assistant-transport state exports", () => {
  it("exposes the assistant-transport surface and no gorp-shaped names", () => {
    expect(typeof entry.AssistantTransportDeltaTracker).toBe("function");
    expect(typeof entry.createObjectStream).toBe("function");
    expect(typeof entry.ObjectStreamResponse).toBe("function");
    expect(typeof entry.fromObjectStreamResponse).toBe("function");
    for (const name of Object.keys(entry)) {
      expect(name.toLowerCase()).not.toContain("gorp");
    }
  });

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
