import * as api from "../index";
import { describe, expect, it } from "vitest";

describe("public API surface", () => {
  it("exports the documented value identifiers", () => {
    expect(typeof api.transcript).toBe("function");
    expect(typeof api.Transcript).toBe("object");
    expect(typeof api.TRANSCRIPT_VERSION).toBe("string");
    expect(typeof api.createChatTestHarness).toBe("function");
    expect(typeof api.setupChatTestKit).toBe("function");
    expect(typeof api.thread).toBe("function");
    expect(typeof api.message).toBe("function");
    expect(typeof api.toolCall).toBe("function");
  });

  it("module export keys are stable", () => {
    const keys = Object.keys(api).sort();
    expect(keys).toEqual(
      expect.arrayContaining([
        "TRANSCRIPT_VERSION",
        "Transcript",
        "createChatTestHarness",
        "message",
        "setupChatTestKit",
        "thread",
        "toolCall",
        "transcript",
      ]),
    );
  });
});
