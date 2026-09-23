import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type AttachmentAdapter,
  CompositeAttachmentAdapter,
  getFileDataURL,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
} from "./attachment";

const originalFileReader = globalThis.FileReader;
const originalBuffer = globalThis.Buffer;

afterEach(() => {
  globalThis.FileReader = originalFileReader;
  globalThis.Buffer = originalBuffer;
});

describe("getFileDataURL", () => {
  it("uses FileReader when available", async () => {
    class FakeFileReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: ((error: unknown) => void) | null = null;
      readAsDataURL(file: File) {
        file
          .arrayBuffer()
          .then((buf) => {
            this.result = `data:${file.type};base64,${originalBuffer.from(buf).toString("base64")}`;
            this.onload?.();
          })
          .catch((error) => this.onerror?.(error));
      }
    }
    globalThis.FileReader = FakeFileReader as unknown as typeof FileReader;

    const file = new File(["hello"], "a.txt", { type: "text/plain" });
    expect(await getFileDataURL(file)).toBe(
      `data:text/plain;base64,${originalBuffer.from("hello").toString("base64")}`,
    );
  });

  it("falls back to Buffer when FileReader is absent", async () => {
    globalThis.FileReader = undefined as unknown as typeof FileReader;

    const file = new File(["hello"], "a.txt", { type: "text/plain" });
    expect(await getFileDataURL(file)).toBe(
      `data:text/plain;base64,${originalBuffer.from("hello").toString("base64")}`,
    );
  });

  it("defaults to application/octet-stream when the file has no type", async () => {
    globalThis.FileReader = undefined as unknown as typeof FileReader;

    const file = new File(["hello"], "a.bin", { type: "" });
    expect(await getFileDataURL(file)).toBe(
      `data:application/octet-stream;base64,${originalBuffer.from("hello").toString("base64")}`,
    );
  });

  it("falls back to chunked btoa when neither FileReader nor Buffer exist", async () => {
    globalThis.FileReader = undefined as unknown as typeof FileReader;
    globalThis.Buffer = undefined as unknown as typeof Buffer;

    const file = new File(["hello"], "a.txt", { type: "text/plain" });
    expect(await getFileDataURL(file)).toBe(
      `data:text/plain;base64,${originalBuffer.from("hello").toString("base64")}`,
    );
  });

  it("encodes large inputs without RangeError on the btoa path", async () => {
    globalThis.FileReader = undefined as unknown as typeof FileReader;
    globalThis.Buffer = undefined as unknown as typeof Buffer;

    const bytes = new Uint8Array(100_000);
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 256;
    const file = new File([bytes], "big.bin", {
      type: "application/octet-stream",
    });

    expect(await getFileDataURL(file)).toBe(
      `data:application/octet-stream;base64,${originalBuffer.from(bytes).toString("base64")}`,
    );
  });

  it("aborts a FileReader read when the signal aborts", async () => {
    const abort = vi.fn();
    class PendingFileReader {
      onload: (() => void) | null = null;
      onerror: ((error: unknown) => void) | null = null;
      abort = abort;
      readAsDataURL() {}
    }
    globalThis.FileReader = PendingFileReader as unknown as typeof FileReader;
    const controller = new AbortController();

    const reading = getFileDataURL(new File(["hello"], "a.txt"), {
      signal: controller.signal,
    });
    controller.abort();

    await expect(reading).rejects.toBe(controller.signal.reason);
    expect(abort).toHaveBeenCalledOnce();
  });

  it("does not start a read once the signal has aborted", async () => {
    const readAsDataURL = vi.fn();
    class FakeFileReader {
      readAsDataURL = readAsDataURL;
    }
    globalThis.FileReader = FakeFileReader as unknown as typeof FileReader;
    const controller = new AbortController();
    controller.abort();

    await expect(
      getFileDataURL(new File(["hello"], "a.txt"), {
        signal: controller.signal,
      }),
    ).rejects.toBe(controller.signal.reason);
    expect(readAsDataURL).not.toHaveBeenCalled();
  });

  it("rejects with an AbortError when the aborted signal carries no reason", async () => {
    globalThis.FileReader = undefined as unknown as typeof FileReader;
    const signal = { aborted: true, reason: undefined } as AbortSignal;

    await expect(
      getFileDataURL(new File(["hello"], "a.txt"), { signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("SimpleImageAttachmentAdapter", () => {
  it("assigns unique IDs to files with the same name", async () => {
    const adapter = new SimpleImageAttachmentAdapter();
    const first = await adapter.add({
      file: new File(["first"], "image.png", { type: "image/png" }),
    });
    const second = await adapter.add({
      file: new File(["second"], "image.png", { type: "image/png" }),
    });

    expect(first.id).not.toBe(second.id);
    expect(first.name).toBe("image.png");
    expect(second.name).toBe("image.png");
  });

  it("sends an image as a data URL", async () => {
    globalThis.FileReader = undefined as unknown as typeof FileReader;

    const file = new File(["img"], "a.png", { type: "image/png" });
    const adapter = new SimpleImageAttachmentAdapter();
    const result = await adapter.send(await adapter.add({ file }));
    const part = result.content[0];
    if (part?.type !== "image") throw new Error("expected image content part");
    expect(part.image).toBe(
      `data:image/png;base64,${originalBuffer.from("img").toString("base64")}`,
    );
  });
});

describe("CompositeAttachmentAdapter", () => {
  it.each(["pending", "complete"])(
    "removes a %s attachment through its matching adapter",
    async (status) => {
      const removed: string[] = [];
      const imageAdapter = {
        accept: "image/*",
        async add({ file }) {
          return {
            id: "image-1",
            type: "image",
            name: file.name,
            file,
            status: { type: "requires-action", reason: "composer-send" },
          };
        },
        async send(attachment) {
          return {
            id: attachment.id,
            type: attachment.type,
            name: attachment.name,
            contentType: attachment.file.type,
            status: { type: "complete" },
            content: [],
          };
        },
        async remove(attachment) {
          removed.push(attachment.id);
        },
      } satisfies AttachmentAdapter;
      const composite = new CompositeAttachmentAdapter([imageAdapter]);
      const pending = await imageAdapter.add({
        file: new File(["image bytes"], "photo.png", { type: "image/png" }),
      });
      const attachment =
        status === "pending" ? pending : await composite.send(pending);

      await composite.remove(attachment);

      expect(removed).toEqual(["image-1"]);
    },
  );
});

describe("built-in adapters under an aborted send", () => {
  it.each([
    ["image/png", "a.png"],
    ["text/plain", "a.txt"],
  ])(
    "stops reading a file of type %s when the send aborts mid-read",
    async (type, name) => {
      globalThis.FileReader = undefined as unknown as typeof FileReader;
      const composite = new CompositeAttachmentAdapter([
        new SimpleImageAttachmentAdapter(),
        new SimpleTextAttachmentAdapter(),
      ]);
      const controller = new AbortController();

      const sending = composite.send(
        {
          id: "a",
          type: "file",
          name,
          file: new File(["bytes"], name, { type }),
          status: { type: "requires-action", reason: "composer-send" },
        },
        { signal: controller.signal },
      );
      controller.abort();

      await expect(sending).rejects.toBe(controller.signal.reason);
    },
  );
});
