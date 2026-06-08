import { describe, expect, it } from "vitest";
import { parseComposerPreview } from "./utils";

describe("parseComposerPreview", () => {
  it("extracts the message queue and canSend", () => {
    const composer = parseComposerPreview({
      text: "hi",
      attachments: [],
      canSend: false,
      queue: [
        { id: "q1", prompt: "first" },
        { id: "q2", prompt: "second" },
      ],
    });
    expect(composer?.canSend).toBe(false);
    expect(composer?.queue).toEqual([
      { id: "q1", prompt: "first" },
      { id: "q2", prompt: "second" },
    ]);
  });

  it("drops malformed queue items and keeps prompt-only entries", () => {
    const composer = parseComposerPreview({
      text: "",
      attachments: [],
      queue: [{ prompt: "ok" }, { id: "x" }, 5, null],
    });
    expect(composer?.queue).toEqual([{ prompt: "ok" }]);
  });

  it("defaults the queue to an empty array when absent", () => {
    const composer = parseComposerPreview({ text: "", attachments: [] });
    expect(composer?.queue).toEqual([]);
  });
});
