// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { OpenCodeAttachmentAdapter } from "./openCodeAttachmentAdapter";

const textPayload = new Uint8Array([0x41, 0x42, 0x43]);
const binaryPayload = new Uint8Array([0x00, 0x01, 0x02, 0x03]);

const makeFile = (name: string, type: string, payload = textPayload) =>
  new File([payload], name, { type });

describe("OpenCodeAttachmentAdapter", () => {
  it("defaults to the OpenCode client accept list and allows overriding it", () => {
    const accept = new OpenCodeAttachmentAdapter().accept;
    expect(accept).toContain("image/png");
    expect(accept).toContain(".ts");
    expect(accept).not.toContain("image/*");

    expect(new OpenCodeAttachmentAdapter({ accept: "image/png" }).accept).toBe(
      "image/png",
    );
    expect(new OpenCodeAttachmentAdapter({ accept: "" }).accept).toBe(accept);
  });

  it("adds an image file as a pending image attachment", async () => {
    const adapter = new OpenCodeAttachmentAdapter();
    const attachment = await adapter.add({
      file: makeFile("photo.png", "image/png"),
    });

    expect(attachment).toMatchObject({
      type: "image",
      name: "photo.png",
      contentType: "image/png",
      status: { type: "requires-action", reason: "composer-send" },
    });
  });

  it("adds a PDF as a pending file attachment", async () => {
    const adapter = new OpenCodeAttachmentAdapter();
    const attachment = await adapter.add({
      file: makeFile("report.pdf", "application/pdf"),
    });

    expect(attachment).toMatchObject({
      type: "file",
      name: "report.pdf",
      contentType: "application/pdf",
    });
  });

  it("normalizes text-like MIME types to text/plain", async () => {
    const adapter = new OpenCodeAttachmentAdapter();

    for (const [name, type] of [
      ["notes.md", "text/markdown"],
      ["config.json", "application/json"],
      ["feed.atom", "application/atom+xml"],
    ] as const) {
      const attachment = await adapter.add({ file: makeFile(name, type) });
      expect(attachment).toMatchObject({
        type: "file",
        contentType: "text/plain",
      });
    }
  });

  it("sniffs files whose browser MIME type is unusable", async () => {
    const adapter = new OpenCodeAttachmentAdapter();
    const attachment = await adapter.add({
      file: makeFile("component.ts", "video/mp2t"),
    });

    expect(attachment).toMatchObject({
      type: "file",
      contentType: "text/plain",
    });
  });

  it("recovers an image MIME type from the extension when the browser reports none", async () => {
    const adapter = new OpenCodeAttachmentAdapter();
    const attachment = await adapter.add({ file: makeFile("photo.png", "") });

    expect(attachment).toMatchObject({
      type: "image",
      contentType: "image/png",
    });
  });

  it("rejects a file that is neither an image, a PDF, nor readable text", async () => {
    const adapter = new OpenCodeAttachmentAdapter();

    await expect(
      adapter.add({ file: makeFile("blob.bin", "", binaryPayload) }),
    ).rejects.toThrow(
      "OpenCodeAttachmentAdapter: blob.bin is not an image, a PDF, or readable text",
    );
  });

  it("sends an image as an inline image part with its filename", async () => {
    const adapter = new OpenCodeAttachmentAdapter();
    const pending = await adapter.add({
      file: makeFile("photo.png", "image/png"),
    });
    const complete = await adapter.send(pending);

    expect(complete.status).toEqual({ type: "complete" });
    expect(complete.content).toEqual([
      {
        type: "image",
        image: "data:image/png;base64,QUJD",
        filename: "photo.png",
      },
    ]);
  });

  it("sends a text-like file with the normalized MIME type", async () => {
    const adapter = new OpenCodeAttachmentAdapter();
    const pending = await adapter.add({
      file: makeFile("notes.md", "text/markdown"),
    });
    const complete = await adapter.send(pending);

    expect(complete.content).toEqual([
      {
        type: "file",
        data: "data:text/markdown;base64,QUJD",
        mimeType: "text/plain",
        filename: "notes.md",
      },
    ]);
  });
});
