import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { SimpleAudioAttachmentAdapter } from "../../legacy-runtime/runtime-cores/adapters/attachment/SimpleAudioAttachmentAdapter";

// Mock FileReader
let latestFileReaderInstance: MockFileReader | null = null;

const setLatestFileReaderInstance = (instance: MockFileReader) => {
  latestFileReaderInstance = instance;
};

class MockFileReader {
  readAsDataURL = vi.fn();
  onload: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  result: string = "data:audio/mpeg;base64,mockdata";

  constructor() {
    setLatestFileReaderInstance(this);
  }
}

vi.stubGlobal("FileReader", MockFileReader);

describe("SimpleAudioAttachmentAdapter", () => {
  afterAll(() => {
    vi.unstubAllGlobals();
  });
  let adapter: SimpleAudioAttachmentAdapter;

  beforeEach(() => {
    adapter = new SimpleAudioAttachmentAdapter();
    latestFileReaderInstance = null;
    vi.clearAllMocks();
  });

  describe("accept", () => {
    it("should accept audio/* MIME types", () => {
      expect(adapter.accept).toBe("audio/*");
    });
  });

  describe("add", () => {
    it("should create pending attachment from audio file", async () => {
      const file = new File(["audio data"], "test.mp3", { type: "audio/mpeg" });
      const result = await adapter.add({ file });

      expect(result).toEqual({
        id: "test.mp3",
        type: "audio",
        name: "test.mp3",
        contentType: "audio/mpeg",
        file,
        status: { type: "requires-action", reason: "composer-send" },
      });
    });
  });

  describe("send", () => {
    it("should convert mp3 to Unstable_AudioMessagePart", async () => {
      const file = new File(["audio data"], "test.mp3", { type: "audio/mpeg" });
      const pending = await adapter.add({ file });

      // Start the send promise which will create a FileReader
      const sendPromise = adapter.send(pending);

      // Trigger the onload callback on the FileReader instance
      latestFileReaderInstance?.onload?.();

      const result = await sendPromise;

      expect(result.content).toEqual([
        {
          type: "audio",
          audio: {
            data: "data:audio/mpeg;base64,mockdata",
            format: "mp3",
          },
        },
      ]);
      expect(result.status).toEqual({ type: "complete" });
    });

    it("should convert wav to Unstable_AudioMessagePart", async () => {
      const file = new File(["audio data"], "test.wav", { type: "audio/wav" });
      const pending = await adapter.add({ file });

      const sendPromise = adapter.send(pending);

      // Set the result and trigger onload
      if (latestFileReaderInstance) {
        latestFileReaderInstance.result = "data:audio/wav;base64,mockdata";
        latestFileReaderInstance.onload?.();
      }

      const result = await sendPromise;

      expect(result.content).toEqual([
        {
          type: "audio",
          audio: {
            data: "data:audio/wav;base64,mockdata",
            format: "wav",
          },
        },
      ]);
    });

    it("should convert ogg to FileMessagePart", async () => {
      const file = new File(["audio data"], "test.ogg", { type: "audio/ogg" });
      const pending = await adapter.add({ file });

      const sendPromise = adapter.send(pending);

      // Set the result and trigger onload
      if (latestFileReaderInstance) {
        latestFileReaderInstance.result = "data:audio/ogg;base64,mockdata";
        latestFileReaderInstance.onload?.();
      }

      const result = await sendPromise;

      expect(result.content).toEqual([
        {
          type: "file",
          data: "data:audio/ogg;base64,mockdata",
          mimeType: "audio/ogg",
          filename: "test.ogg",
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
