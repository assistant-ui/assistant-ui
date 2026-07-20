import { describe, expect, it } from "vitest";
import * as gorp from "./gorp";

describe("gorp entry", () => {
  it("exposes the Gorp-over-SSE surface", () => {
    expect(typeof gorp.createGorpStream).toBe("function");
    expect(typeof gorp.GorpStreamEncoder).toBe("function");
    expect(typeof gorp.GorpStreamDecoder).toBe("function");
    expect(typeof gorp.GorpStreamResponse).toBe("function");
    expect(typeof gorp.fromGorpStreamResponse).toBe("function");
    expect(typeof gorp.GorpStreamAccumulator).toBe("function");
    expect(typeof gorp.GorpStreamDeltaTracker).toBe("function");
  });

  it("streams operations end to end through the SSE wire", async () => {
    const stream = gorp.createGorpStream({
      execute: (controller) => {
        controller.enqueue([
          { type: "set", path: ["message"], value: "Hello" },
        ]);
        controller.enqueue([
          { type: "append-text", path: ["message"], value: " World" },
        ]);
      },
    });

    const response = new gorp.GorpStreamResponse(stream);
    const decoded = gorp.fromGorpStreamResponse(response);

    const tracker = new gorp.GorpStreamDeltaTracker();
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
