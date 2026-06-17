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

  it("parses attachments with kind, contentType, and upload status", () => {
    const composer = parseComposerPreview({
      text: "",
      attachments: [
        {
          id: "a1",
          type: "image",
          name: "photo.png",
          contentType: "image/png",
          status: { type: "running", reason: "uploading", progress: 0.5 },
        },
        {
          id: "a2",
          type: "file",
          name: "doc.pdf",
          status: { type: "complete" },
        },
      ],
    });
    expect(composer?.attachments).toHaveLength(2);
    expect(composer?.attachments[0]).toMatchObject({
      name: "photo.png",
      kind: "image",
      contentType: "image/png",
      status: { type: "running", reason: "uploading", progress: 0.5 },
    });
    expect(composer?.attachments[1]?.status).toEqual({ type: "complete" });
  });

  it("falls back to the id for a nameless attachment", () => {
    const composer = parseComposerPreview({
      text: "",
      attachments: [{ id: "x" }],
    });
    expect(composer?.attachments).toEqual([{ name: "x", id: "x" }]);
  });
});
