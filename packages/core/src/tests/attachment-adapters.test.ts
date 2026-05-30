import { describe, it, expect } from "vitest";
import {
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
} from "../adapters/attachment";
import type { PendingAttachment } from "../types/attachment";

const pending = (
  file: File,
  type: "image" | "document",
): PendingAttachment => ({
  id: file.name,
  type,
  name: file.name,
  contentType: file.type,
  file,
  status: { type: "requires-action", reason: "composer-send" },
});

describe("Simple attachment adapters (no FileReader)", () => {
  it("SimpleTextAttachmentAdapter reads text without FileReader", async () => {
    const file = new File(["hello world"], "note.txt", { type: "text/plain" });
    const result = await new SimpleTextAttachmentAdapter().send(
      pending(file, "document"),
    );

    expect(result.status).toEqual({ type: "complete" });
    expect(result.content).toEqual([
      {
        type: "text",
        text: "<attachment name=note.txt>\nhello world\n</attachment>",
      },
    ]);
  });

  it("SimpleImageAttachmentAdapter produces a base64 data URL without FileReader", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const file = new File([bytes], "pixel.png", { type: "image/png" });
    const result = await new SimpleImageAttachmentAdapter().send(
      pending(file, "image"),
    );

    expect(result.content).toEqual([
      {
        type: "image",
        image: `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`,
      },
    ]);
  });
});
