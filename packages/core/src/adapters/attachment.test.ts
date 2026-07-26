import { afterEach, describe, expect, it } from "vitest";
import { getFileDataURL, SimpleImageAttachmentAdapter } from "./attachment";

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
