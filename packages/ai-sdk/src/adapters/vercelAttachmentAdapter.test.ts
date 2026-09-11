import { afterEach, describe, expect, it } from "vitest";
import { vercelAttachmentAdapter } from "./vercelAttachmentAdapter";

const originalFileReader = globalThis.FileReader;

afterEach(() => {
  globalThis.FileReader = originalFileReader;
});

describe("vercelAttachmentAdapter", () => {
  it("sends a file as a data URL via the shared core encoder", async () => {
    globalThis.FileReader = undefined as unknown as typeof FileReader;

    const file = new File(["hello"], "a.txt", { type: "text/plain" });
    const result = await vercelAttachmentAdapter.send({
      id: "1",
      type: "file",
      name: file.name,
      file,
      contentType: file.type,
      content: [],
      status: { type: "requires-action", reason: "composer-send" },
    });

    const part = result.content[0];
    if (part?.type !== "file") throw new Error("expected file content part");
    expect(part.data).toBe("data:text/plain;base64,aGVsbG8=");
  });
});
