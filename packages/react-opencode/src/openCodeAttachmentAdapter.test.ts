import { afterEach, describe, expect, it } from "vitest";
import { fileMatchesAccept } from "@assistant-ui/core/internal";
import { openCodeAttachmentAdapter } from "./openCodeAttachmentAdapter";

const originalFileReader = globalThis.FileReader;

afterEach(() => {
  globalThis.FileReader = originalFileReader;
});

describe("openCodeAttachmentAdapter", () => {
  it("accepts the same file families as the OpenCode prompt", () => {
    expect(
      fileMatchesAccept(
        { name: "photo.png", type: "image/png" },
        openCodeAttachmentAdapter.accept,
      ),
    ).toBe(true);
    expect(
      fileMatchesAccept(
        { name: "notes.ts", type: "" },
        openCodeAttachmentAdapter.accept,
      ),
    ).toBe(true);
    expect(
      fileMatchesAccept(
        {
          name: "report.docx",
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
        openCodeAttachmentAdapter.accept,
      ),
    ).toBe(false);
  });

  it("sends an image as an image part", async () => {
    globalThis.FileReader = undefined as unknown as typeof FileReader;
    const file = new File([new Uint8Array([137, 80, 78, 71])], "photo.png", {
      type: "image/png",
    });

    const pending = await openCodeAttachmentAdapter.add({ file });
    const complete = await openCodeAttachmentAdapter.send(pending);

    expect(pending).toMatchObject({
      type: "image",
      name: "photo.png",
      contentType: "image/png",
      status: { type: "requires-action", reason: "composer-send" },
    });
    expect(complete).toMatchObject({
      type: "image",
      name: "photo.png",
      contentType: "image/png",
      status: { type: "complete" },
      content: [
        {
          type: "image",
          image: "data:image/png;base64,iVBORw==",
          filename: "photo.png",
        },
      ],
    });
  });

  it("sends a non-image as a native file part", async () => {
    globalThis.FileReader = undefined as unknown as typeof FileReader;
    const file = new File(["report"], "report.pdf", {
      type: "application/pdf",
    });

    const pending = await openCodeAttachmentAdapter.add({ file });
    const complete = await openCodeAttachmentAdapter.send(pending);

    expect(pending).toMatchObject({
      type: "file",
      name: "report.pdf",
      contentType: "application/pdf",
    });
    expect(complete.content).toEqual([
      {
        type: "file",
        data: "data:application/pdf;base64,cmVwb3J0",
        filename: "report.pdf",
        mimeType: "application/pdf",
      },
    ]);
  });

  it("normalizes browser text formats for OpenCode's text-file path", async () => {
    globalThis.FileReader = undefined as unknown as typeof FileReader;
    const file = new File(['{"ready":true}'], "config.json", {
      type: "application/json",
    });

    const complete = await openCodeAttachmentAdapter.send(
      await openCodeAttachmentAdapter.add({ file }),
    );

    expect(complete.contentType).toBe("text/plain");
    expect(complete.content).toEqual([
      {
        type: "file",
        data: "data:text/plain;base64,eyJyZWFkeSI6dHJ1ZX0=",
        filename: "config.json",
        mimeType: "text/plain",
      },
    ]);
  });

  it("normalizes typeless source files after verifying text content", async () => {
    globalThis.FileReader = undefined as unknown as typeof FileReader;
    const file = new File(["export const ready = true;"], "config.ts");

    const complete = await openCodeAttachmentAdapter.send(
      await openCodeAttachmentAdapter.add({ file }),
    );

    expect(complete.contentType).toBe("text/plain");
    expect(complete.content[0]).toMatchObject({
      type: "file",
      filename: "config.ts",
      mimeType: "text/plain",
    });
  });

  it("rejects binary content disguised with a text extension", async () => {
    const file = new File(
      [new Uint8Array([80, 75, 3, 4, 0, 1, 2, 3])],
      "report.txt",
    );

    await expect(openCodeAttachmentAdapter.add({ file })).rejects.toThrow(
      "OpenCode does not support the file type of report.txt",
    );
  });

  it("assigns unique IDs and removes without side effects", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    const first = await openCodeAttachmentAdapter.add({ file });
    const second = await openCodeAttachmentAdapter.add({ file });

    expect(first.id).not.toBe(second.id);
    await expect(
      openCodeAttachmentAdapter.remove(first),
    ).resolves.toBeUndefined();
  });
});
