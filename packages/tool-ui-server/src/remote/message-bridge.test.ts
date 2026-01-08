import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MessageBridge, MessageBridgeHandlers } from "./message-bridge";

describe("MessageBridge", () => {
  let handlers: MessageBridgeHandlers;
  let bridge: MessageBridge;
  let mockIframe: HTMLIFrameElement;
  let mockContentWindow: Window;

  beforeEach(() => {
    handlers = {
      callTool: vi.fn().mockResolvedValue({ content: "result" }),
      setWidgetState: vi.fn(),
      sendFollowUpMessage: vi.fn().mockResolvedValue(undefined),
      requestDisplayMode: vi.fn().mockResolvedValue({ mode: "fullscreen" }),
      requestModal: vi.fn().mockResolvedValue(undefined),
      requestClose: vi.fn(),
      openExternal: vi.fn(),
      notifyIntrinsicHeight: vi.fn(),
      uploadFile: vi.fn().mockResolvedValue({ fileId: "test-file-id" }),
      getFileDownloadUrl: vi
        .fn()
        .mockResolvedValue({ downloadUrl: "test-download-url" }),
    };

    mockContentWindow = {
      postMessage: vi.fn(),
    } as unknown as Window;

    mockIframe = {
      contentWindow: mockContentWindow,
    } as unknown as HTMLIFrameElement;

    bridge = new MessageBridge(handlers);
    bridge.attach(mockIframe);
  });

  afterEach(() => {
    bridge.detach();
  });

  it("sends globals to iframe", () => {
    const globals = {
      theme: "dark" as const,
      locale: "en-US",
      displayMode: "inline" as const,
      maxHeight: 600,
      toolInput: { query: "test" },
      toolOutput: null,
      widgetState: null,
      userAgent: {
        device: { type: "desktop" as const },
        capabilities: { hover: true, touch: false },
      },
      safeArea: { insets: { top: 0, bottom: 0, left: 0, right: 0 } },
      userLocation: null,
      toolResponseMetadata: null,
    };

    bridge.sendGlobals(globals);

    expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
      { type: "AUI_SET_GLOBALS", globals },
      "*",
    );
  });

  it("handles callTool method call", async () => {
    const messageEvent = new MessageEvent("message", {
      data: {
        type: "AUI_METHOD_CALL",
        id: "test-123",
        method: "callTool",
        args: ["myTool", { arg1: "value" }],
      },
      source: mockContentWindow,
    });

    window.dispatchEvent(messageEvent);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(handlers.callTool).toHaveBeenCalledWith("myTool", { arg1: "value" });
    expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
      {
        type: "AUI_METHOD_RESPONSE",
        id: "test-123",
        result: { content: "result" },
      },
      "*",
    );
  });

  it("handles errors in method calls", async () => {
    handlers.callTool = vi.fn().mockRejectedValue(new Error("Tool not found"));

    const messageEvent = new MessageEvent("message", {
      data: {
        type: "AUI_METHOD_CALL",
        id: "test-456",
        method: "callTool",
        args: ["unknownTool", {}],
      },
      source: mockContentWindow,
    });

    window.dispatchEvent(messageEvent);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
      {
        type: "AUI_METHOD_RESPONSE",
        id: "test-456",
        error: "Tool not found",
      },
      "*",
    );
  });

  it("handles legacy resize messages", () => {
    const legacyHandlers = {
      onResize: vi.fn(),
    };

    const bridgeWithLegacy = new MessageBridge(handlers, legacyHandlers);
    bridgeWithLegacy.attach(mockIframe);

    const messageEvent = new MessageEvent("message", {
      data: { type: "resize", payload: 500 },
      source: mockContentWindow,
    });

    window.dispatchEvent(messageEvent);

    expect(legacyHandlers.onResize).toHaveBeenCalledWith(500);
    expect(handlers.notifyIntrinsicHeight).toHaveBeenCalledWith(500);

    bridgeWithLegacy.detach();
  });
});
