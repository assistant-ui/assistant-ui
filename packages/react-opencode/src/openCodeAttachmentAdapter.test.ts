// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { OpenCodeAttachmentAdapter } from "./openCodeAttachmentAdapter";

const pngFile = () =>
  new File([new Uint8Array([0x41, 0x42, 0x43])], "photo.png", {
    type: "image/png",
  });

const pdfFile = () =>
  new File([new Uint8Array([0x41, 0x42, 0x43])], "report.pdf", {
    type: "application/pdf",
  });

const unknownFile = () =>
  new File([new Uint8Array([0x41, 0x42, 0x43])], "script.xyz", { type: "" });

describe("OpenCodeAttachmentAdapter", () => {
  it("exposes the OpenCode-native accept list and allows overriding it", () => {
    expect(new OpenCodeAttachmentAdapter().accept).toBe(
      "image/*,application/pdf,text/*",
    );
    expect(
      new OpenCodeAttachmentAdapter({ accept: "image/*,.ts" }).accept,
    ).toBe("image/*,.ts");
  });

  it("adds an image file as a pending image attachment", async () => {
    const adapter = new OpenCodeAttachmentAdapter();
    const attachment = await adapter.add({ file: pngFile() });

    expect(attachment).toMatchObject({
      type: "image",
      name: "photo.png",
      contentType: "image/png",
      status: { type: "requires-action", reason: "composer-send" },
    });
  });

  it("adds a non-image file as a pending file attachment", async () => {
    const adapter = new OpenCodeAttachmentAdapter();
    const attachment = await adapter.add({ file: pdfFile() });

    expect(attachment).toMatchObject({
      type: "file",
      name: "report.pdf",
      contentType: "application/pdf",
    });
  });

  it("defaults an unknown browser MIME type to application/octet-stream", async () => {
    const adapter = new OpenCodeAttachmentAdapter();
    const attachment = await adapter.add({ file: unknownFile() });

    expect(attachment).toMatchObject({
      type: "file",
      name: "script.xyz",
      contentType: "application/octet-stream",
    });
  });

  it("sends an image as an inline image part with its filename", async () => {
    const adapter = new OpenCodeAttachmentAdapter();
    const pending = await adapter.add({ file: pngFile() });
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

  it("sends a non-image file as an inline file part with mime and filename", async () => {
    const adapter = new OpenCodeAttachmentAdapter();
    const pending = await adapter.add({ file: pdfFile() });
    const complete = await adapter.send(pending);

    expect(complete.content).toEqual([
      {
        type: "file",
        data: "data:application/pdf;base64,QUJD",
        mimeType: "application/pdf",
        filename: "report.pdf",
      },
    ]);
  });
});
