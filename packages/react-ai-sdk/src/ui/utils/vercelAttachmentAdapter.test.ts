import { afterEach, describe, expect, it } from "vitest";
import { vercelAttachmentAdapter } from "./vercelAttachmentAdapter";

const originalFileReader = globalThis.FileReader;
const originalBuffer = globalThis.Buffer;

afterEach(() => {
  globalThis.FileReader = originalFileReader;
  globalThis.Buffer = originalBuffer;
});

const makeAttachment = (file: File) => ({
  id: "1",
  type: "file" as const,
  name: file.name,
  file,
  contentType: file.type,
  content: [],
  status: {
    type: "requires-action" as const,
    reason: "composer-send" as const,
  },
});

const sendFile = async (file: File) => {
  const result = await vercelAttachmentAdapter.send(makeAttachment(file));
  const part = result.content[0];
  if (part?.type !== "file") throw new Error("expected file content part");
  return part.data;
};

describe("vercelAttachmentAdapter", () => {
  it("uses FileReader when available (browser/RN path unchanged)", async () => {
    class FakeFileReader {
      result: string | null = null;
      onload: (() => void) | null = null;
      onerror: ((error: unknown) => void) | null = null;
      readAsDataURL(file: File) {
        file
          .arrayBuffer()
          .then((buf) => {
            const base64 = Buffer.from(buf).toString("base64");
            this.result = `data:${file.type};base64,${base64}`;
            this.onload?.();
          })
          .catch((error) => this.onerror?.(error));
      }
    }
    globalThis.FileReader = FakeFileReader as unknown as typeof FileReader;

    const file = new File(["hello"], "a.txt", { type: "text/plain" });
    expect(await sendFile(file)).toBe(
      `data:text/plain;base64,${Buffer.from("hello").toString("base64")}`,
    );
  });

  it("falls back to Buffer when FileReader is absent (Node/react-ink)", async () => {
    globalThis.FileReader = undefined as unknown as typeof FileReader;

    const file = new File(["hello"], "a.txt", { type: "text/plain" });
    expect(await sendFile(file)).toBe(
      `data:text/plain;base64,${Buffer.from("hello").toString("base64")}`,
    );
  });

  it("defaults to application/octet-stream when the file has no type", async () => {
    globalThis.FileReader = undefined as unknown as typeof FileReader;

    const file = new File(["hello"], "a.bin", { type: "" });
    expect(await sendFile(file)).toBe(
      `data:application/octet-stream;base64,${Buffer.from("hello").toString("base64")}`,
    );
  });

  it("falls back to chunked btoa when neither FileReader nor Buffer exist", async () => {
    globalThis.FileReader = undefined as unknown as typeof FileReader;
    globalThis.Buffer = undefined as unknown as typeof Buffer;

    const file = new File(["hello"], "a.txt", { type: "text/plain" });
    const data = await sendFile(file);
    expect(data).toBe(
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

    const data = await sendFile(file);
    const expected = originalBuffer.from(bytes).toString("base64");
    expect(data).toBe(`data:application/octet-stream;base64,${expected}`);
  });
});
