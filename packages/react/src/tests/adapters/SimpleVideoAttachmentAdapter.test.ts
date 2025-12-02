import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { SimpleVideoAttachmentAdapter } from "../../legacy-runtime/runtime-cores/adapters/attachment/SimpleVideoAttachmentAdapter";

// Mock FileReader
let latestFileReaderInstance: MockFileReader | null = null;

const setLatestFileReaderInstance = (instance: MockFileReader) => {
  latestFileReaderInstance = instance;
};

class MockFileReader {
  readAsDataURL = vi.fn();
  onload: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  result: string = "data:video/mp4;base64,mockdata";

  constructor() {
    setLatestFileReaderInstance(this);
  }
}

vi.stubGlobal("FileReader", MockFileReader);

describe("SimpleVideoAttachmentAdapter", () => {
  afterAll(() => {
    vi.unstubAllGlobals();
  });
  let adapter: SimpleVideoAttachmentAdapter;

  beforeEach(() => {
    adapter = new SimpleVideoAttachmentAdapter();
    latestFileReaderInstance = null;
    vi.clearAllMocks();
  });

  describe("accept", () => {
    it("should accept video/* MIME types", () => {
      expect(adapter.accept).toBe("video/*");
    });
  });

  describe("add", () => {
    it("should create pending attachment from video file", async () => {
      const file = new File(["video data"], "test.mp4", { type: "video/mp4" });
      const result = await adapter.add({ file });

      expect(result).toEqual({
        id: "test.mp4",
        type: "video",
        name: "test.mp4",
        contentType: "video/mp4",
        file,
        status: { type: "requires-action", reason: "composer-send" },
      });
    });
  });

  describe("send", () => {
    it("should convert video to FileMessagePart", async () => {
      const file = new File(["video data"], "test.mp4", { type: "video/mp4" });
      const pending = await adapter.add({ file });

      // Start the send promise which will create a FileReader
      const sendPromise = adapter.send(pending);

      // Trigger the onload callback on the FileReader instance
      latestFileReaderInstance?.onload?.();

      const result = await sendPromise;

      expect(result.content).toEqual([
        {
          type: "file",
          data: "data:video/mp4;base64,mockdata",
          mimeType: "video/mp4",
          filename: "test.mp4",
        },
      ]);
      expect(result.status).toEqual({ type: "complete" });
    });

    it("should handle webm videos", async () => {
      const file = new File(["video data"], "test.webm", {
        type: "video/webm",
      });
      const pending = await adapter.add({ file });

      const sendPromise = adapter.send(pending);

      // Set the result and trigger onload
      if (latestFileReaderInstance) {
        latestFileReaderInstance.result = "data:video/webm;base64,mockdata";
        latestFileReaderInstance.onload?.();
      }

      const result = await sendPromise;

      expect(result.content).toEqual([
        {
          type: "file",
          data: "data:video/webm;base64,mockdata",
          mimeType: "video/webm",
          filename: "test.webm",
        },
      ]);
    });
  });

  describe("remove", () => {
    it("should be a no-op", async () => {
      await expect(adapter.remove()).resolves.toBeUndefined();
    });
  });
});
