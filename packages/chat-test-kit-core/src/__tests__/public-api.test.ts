import { describe, expect, it } from "vitest";

import * as api from "../index";

describe("public API surface", () => {
  it("exports the documented value identifiers", () => {
    expect(typeof api.transcript).toBe("function");
    expect(typeof api.Transcript.fromJSON).toBe("function");
    expect(typeof api.createHeadlessAdapter).toBe("function");
    expect(typeof api.Replayer).toBe("function");
    expect(typeof api.VirtualClock).toBe("function");
    expect(api.TRANSCRIPT_VERSION).toBe("0");
    expect(typeof api.transcriptSchema).toBe("object");
  });

  it("module export keys are stable", () => {
    expect(Object.keys(api).sort()).toEqual([
      "Replayer",
      "TRANSCRIPT_VERSION",
      "Transcript",
      "VirtualClock",
      "createHeadlessAdapter",
      "transcript",
      "transcriptSchema",
    ]);
  });
});
