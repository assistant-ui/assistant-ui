import { describe, expect, it } from "vitest";
import type { PendingAttachment } from "../types/attachment";
import {
  type AttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
} from "../adapters/attachment";

describe("SimpleTextAttachmentAdapter", () => {
  const makeFile = (contents: string, name = "notes.md") =>
    new File([contents], name, { type: "text/markdown" });

  it("adds a file as a pending document attachment", async () => {
    const pending = (await new SimpleTextAttachmentAdapter().add({
      file: makeFile("hello"),
    })) as PendingAttachment;

    expect(pending).toMatchObject({
      id: expect.any(String),
      type: "document",
      name: "notes.md",
      contentType: "text/markdown",
      status: { type: "requires-action", reason: "composer-send" },
    });
  });

  it("sends the file contents as a text part without FileReader", async () => {
    expect(typeof FileReader).toBe("undefined");

    const adapter = new SimpleTextAttachmentAdapter();
    const pending = (await adapter.add({
      file: makeFile("- retry with backoff\n- cap attempts at 3"),
    })) as PendingAttachment;
    const complete = await adapter.send(pending);

    expect(complete.status).toEqual({ type: "complete" });
    expect(complete.content).toEqual([
      {
        type: "text",
        text: "<attachment name=notes.md>\n- retry with backoff\n- cap attempts at 3\n</attachment>",
      },
    ]);
  });

  it("remove resolves without error", async () => {
    const adapter: AttachmentAdapter = new SimpleTextAttachmentAdapter();
    const pending = (await adapter.add({
      file: makeFile("hello"),
    })) as PendingAttachment;
    await expect(adapter.remove(pending)).resolves.toBeUndefined();
  });
});

describe("SimpleImageAttachmentAdapter", () => {
  const makeImage = (bytes: number[], name = "pixel.png") =>
    new File([new Uint8Array(bytes)], name, { type: "image/png" });

  it("adds a file as a pending image attachment", async () => {
    const pending = (await new SimpleImageAttachmentAdapter().add({
      file: makeImage([1, 2, 3]),
    })) as PendingAttachment;

    expect(pending).toMatchObject({
      id: expect.any(String),
      type: "image",
      name: "pixel.png",
      contentType: "image/png",
      status: { type: "requires-action", reason: "composer-send" },
    });
  });

  it("sends the file as a base64 data URL without FileReader", async () => {
    expect(typeof FileReader).toBe("undefined");

    const adapter = new SimpleImageAttachmentAdapter();
    const pending = (await adapter.add({
      file: makeImage([137, 80, 78, 71]),
    })) as PendingAttachment;
    const complete = await adapter.send(pending);

    expect(complete.status).toEqual({ type: "complete" });
    expect(complete.content).toEqual([
      { type: "image", image: "data:image/png;base64,iVBORw==" },
    ]);
  });
});
