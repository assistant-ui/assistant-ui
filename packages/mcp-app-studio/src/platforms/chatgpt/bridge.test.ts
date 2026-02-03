import { describe, it, expect, afterEach } from "vitest";
import { ChatGPTBridge } from "./bridge";

describe("ChatGPTBridge.connect", () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it("forwards tool response metadata on initial tool output", async () => {
    const toolResponseMetadata = { requestId: "req_123" };

    const mockOpenai = {
      theme: "light",
      locale: "en",
      displayMode: "inline",
      previousDisplayMode: null,
      maxHeight: 320,
      toolInput: {},
      toolOutput: { ok: true },
      toolResponseMetadata,
      widgetState: null,
      userAgent: {
        device: { type: "desktop" as const },
        capabilities: { hover: true, touch: false },
      },
      safeArea: { insets: { top: 0, right: 0, bottom: 0, left: 0 } },
      view: null,
      userLocation: null,
      callTool: async () => ({}),
      setWidgetState: () => {},
      requestDisplayMode: async ({ mode }: { mode: string }) => ({ mode }),
      notifyIntrinsicHeight: () => {},
      requestClose: () => {},
      sendFollowUpMessage: async () => {},
      openExternal: () => {},
      uploadFile: async () => ({ fileId: "file_1" }),
      getFileDownloadUrl: async () => ({ downloadUrl: "https://example.com" }),
      requestModal: async () => {},
    };

    const mockWindow = {
      openai: mockOpenai,
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    globalThis.window = mockWindow as unknown as Window & typeof globalThis;

    const bridge = new ChatGPTBridge();
    let received: { _meta?: Record<string, unknown> } | undefined;

    bridge.onToolResult((result) => {
      received = result;
    });

    await bridge.connect();

    expect(received?._meta).toEqual(toolResponseMetadata);
  });
});
