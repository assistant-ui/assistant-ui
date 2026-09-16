import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "assistant-cloud";
import type { PendingAttachment } from "../../../types/attachment";
import { CloudFileAttachmentAdapter } from "./CloudFileAttachmentAdapter";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const makeCloud = () =>
  ({
    files: {
      generatePresignedUploadUrl: vi.fn().mockResolvedValue({
        signedUrl: "https://storage.example/upload",
        publicUrl: "https://cdn.example/file.png",
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

  it("does not finish an upload removed while requesting its URL", async () => {
    const presigned = deferred<{
      signedUrl: string;
      publicUrl: string;
    }>();
    const cloud = makeCloud();
    vi.mocked(cloud.files.generatePresignedUploadUrl).mockReturnValue(
      presigned.promise,
    );
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const adapter = new CloudFileAttachmentAdapter(cloud);
    const generator = adapter.add({ file: makeFile() });

    const running = await generator.next();
    const completion = generator.next();
    await vi.waitFor(() => {
      expect(cloud.files.generatePresignedUploadUrl).toHaveBeenCalledOnce();
    });

    await adapter.remove(running.value!);
    presigned.resolve({
      signedUrl: "https://storage.example/upload",
      publicUrl: "https://cdn.example/file.png",
    });

    await expect(completion).resolves.toEqual({ done: true, value: undefined });
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(adapter.send(running.value!)).rejects.toThrow(
      "Attachment not uploaded",
    );
  });

  it("does not finish an upload removed during the file request", async () => {
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal!.addEventListener(
          "abort",
          () =>
            reject(new DOMException("The operation was aborted", "AbortError")),
          { once: true },
        );
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const adapter = new CloudFileAttachmentAdapter(makeCloud());
    const generator = adapter.add({ file: makeFile() });

    const running = await generator.next();
    const completion = generator.next();
    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce();
    });

    await adapter.remove(running.value!);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://storage.example/upload",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(vi.mocked(fetchMock).mock.calls[0]?.[1]?.signal?.aborted).toBe(true);

    await expect(completion).resolves.toEqual({ done: true, value: undefined });
    expect(errorSpy).not.toHaveBeenCalled();
    await expect(adapter.send(running.value!)).rejects.toThrow(
      "Attachment not uploaded",
    );
  });
});
