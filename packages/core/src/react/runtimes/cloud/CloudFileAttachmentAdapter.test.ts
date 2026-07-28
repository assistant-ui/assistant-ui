import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "assistant-cloud";
import type { PendingAttachment } from "../../../types/attachment";
import { CloudFileAttachmentAdapter } from "./CloudFileAttachmentAdapter";

const makeCloud = (publicUrl = "https://cdn.example/file.png") =>
  ({
    files: {
      generatePresignedUploadUrl: vi.fn().mockResolvedValue({
        signedUrl: "https://storage.example/upload",
        publicUrl,
      }),
    },
  }) as unknown as AssistantCloud;

const makeFile = () =>
  new File([new Uint8Array([1, 2, 3])], "pixel.png", { type: "image/png" });

const drain = async (adapter: CloudFileAttachmentAdapter) => {
  const yields: PendingAttachment[] = [];
  for await (const value of adapter.add({ file: makeFile() })) {
    yields.push(value);
  }
  return yields;
};

describe("CloudFileAttachmentAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("marks the attachment ready when the upload succeeds", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const adapter = new CloudFileAttachmentAdapter(makeCloud());

    const yields = await drain(adapter);

    expect(yields.at(0)?.status).toEqual({
      type: "running",
      reason: "uploading",
      progress: 0,
    });
    expect(yields.at(-1)?.status).toEqual({
      type: "requires-action",
      reason: "composer-send",
    });

    const complete = await adapter.send(yields.at(-1)!);
    expect(complete.status).toEqual({ type: "complete" });
    expect(complete.content).toEqual([
      {
        type: "image",
        image: "https://cdn.example/file.png",
        filename: "pixel.png",
      },
    ]);
  });

  it("uploads when Web Crypto is unavailable", async () => {
    vi.stubGlobal("crypto", undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    const adapter = new CloudFileAttachmentAdapter(makeCloud());

    const yields = await drain(adapter);

    expect(yields).toHaveLength(2);
    expect(yields[0]?.id).toBeTruthy();
    expect(yields[1]?.id).toBe(yields[0]?.id);
    expect(yields.at(-1)?.status).toEqual({
      type: "requires-action",
      reason: "composer-send",
    });
  });

  it("marks the attachment incomplete when the upload returns an HTTP error", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      }),
    );
    const adapter = new CloudFileAttachmentAdapter(makeCloud());

    const yields = await drain(adapter);

    expect(yields.at(-1)?.status).toEqual({
      type: "incomplete",
      reason: "error",
      message: "Failed to upload file: 403 Forbidden",
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "[assistant-ui] Failed to upload attachment:",
      expect.objectContaining({
        message: "Failed to upload file: 403 Forbidden",
      }),
    );
    await expect(adapter.send(yields.at(-1)!)).rejects.toThrow(
      "Attachment not uploaded",
    );
  });

  it("marks the attachment incomplete when the upload throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const uploadError = new Error("network down");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(uploadError));
    const adapter = new CloudFileAttachmentAdapter(makeCloud());

    const yields = await drain(adapter);

    expect(yields.at(-1)?.status).toEqual({
      type: "incomplete",
      reason: "error",
      message: "network down",
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "[assistant-ui] Failed to upload attachment:",
      uploadError,
    );
    await expect(adapter.send(yields.at(-1)!)).rejects.toThrow(
      "Attachment not uploaded",
    );
  });

  it("reuploads attachments with the current Cloud client before sending", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const firstCloud = makeCloud();
    const secondCloud = makeCloud("https://cdn.example/current-file.png");
    let cloud = firstCloud;
    const adapter = new CloudFileAttachmentAdapter(() => cloud);

    const yields = await drain(adapter);
    expect(yields.at(-1)?.status).toEqual({
      type: "requires-action",
      reason: "composer-send",
    });

    cloud = secondCloud;

    const complete = await adapter.send(yields.at(-1)!);

    expect(firstCloud.files.generatePresignedUploadUrl).toHaveBeenCalledTimes(
      1,
    );
    expect(secondCloud.files.generatePresignedUploadUrl).toHaveBeenCalledTimes(
      1,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(complete.content).toEqual([
      {
        type: "image",
        image: "https://cdn.example/current-file.png",
        filename: "pixel.png",
      },
    ]);
  });
});
