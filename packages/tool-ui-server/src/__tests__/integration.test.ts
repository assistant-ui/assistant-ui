import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageBridge } from "../remote/message-bridge";
import { DEFAULT_GLOBALS } from "../runtime/bridge-script";

describe("AUI Protocol Integration", () => {
  let messageHandlers: Map<string, (event: MessageEvent) => void>;
  let mockIframeWindow: Window;

  beforeEach(() => {
    messageHandlers = new Map();

    mockIframeWindow = {
      postMessage: vi.fn((data: unknown) => {
        setTimeout(() => {
          const handler = messageHandlers.get("parent");
          handler?.({
            data,
            source: mockIframeWindow,
            origin: "*",
          } as MessageEvent);
        }, 0);
      }),
    } as unknown as Window;
  });

  it("completes full callTool round-trip", async () => {
    const handlers = {
      callTool: vi.fn().mockResolvedValue({ content: "Tool result" }),
      setWidgetState: vi.fn(),
      sendFollowUpMessage: vi.fn(),
      requestDisplayMode: vi.fn(),
      requestModal: vi.fn(),
      requestClose: vi.fn(),
      openExternal: vi.fn(),
      notifyIntrinsicHeight: vi.fn(),
      uploadFile: vi.fn().mockResolvedValue({ fileId: "test-file-id" }),
      getFileDownloadUrl: vi
        .fn()
        .mockResolvedValue({ downloadUrl: "test-download-url" }),
    };

    const mockIframe = {
      contentWindow: mockIframeWindow,
    } as unknown as HTMLIFrameElement;

    const bridge = new MessageBridge(handlers);
    bridge.attach(mockIframe);

    const methodCall = {
      type: "AUI_METHOD_CALL",
      id: "test-123",
      method: "callTool",
      args: ["search", { query: "test" }],
    };

    const messageEvent = new MessageEvent("message", {
      data: methodCall,
      source: mockIframeWindow,
    });

    window.dispatchEvent(messageEvent);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handlers.callTool).toHaveBeenCalledWith("search", { query: "test" });

    expect(mockIframeWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUI_METHOD_RESPONSE",
        id: "test-123",
        result: { content: "Tool result" },
      }),
      "*",
    );

    bridge.detach();
  });

  it("globals update sends message to iframe", async () => {
    const handlers = {
      callTool: vi.fn(),
      setWidgetState: vi.fn(),
      sendFollowUpMessage: vi.fn(),
      requestDisplayMode: vi.fn(),
      requestModal: vi.fn(),
      requestClose: vi.fn(),
      openExternal: vi.fn(),
      notifyIntrinsicHeight: vi.fn(),
      uploadFile: vi.fn().mockResolvedValue({ fileId: "test-file-id" }),
      getFileDownloadUrl: vi
        .fn()
        .mockResolvedValue({ downloadUrl: "test-download-url" }),
    };

    const mockIframe = {
      contentWindow: mockIframeWindow,
    } as unknown as HTMLIFrameElement;

    const bridge = new MessageBridge(handlers);
    bridge.attach(mockIframe);

    const newGlobals = {
      ...DEFAULT_GLOBALS,
      theme: "dark" as const,
      locale: "es-ES",
    };

    bridge.sendGlobals(newGlobals);

    expect(mockIframeWindow.postMessage).toHaveBeenCalledWith(
      {
        type: "AUI_SET_GLOBALS",
        globals: newGlobals,
      },
      "*",
    );

    bridge.detach();
  });

  it("handles setWidgetState method call", async () => {
    const handlers = {
      callTool: vi.fn(),
      setWidgetState: vi.fn(),
      sendFollowUpMessage: vi.fn(),
      requestDisplayMode: vi.fn(),
      requestModal: vi.fn(),
      requestClose: vi.fn(),
      openExternal: vi.fn(),
      notifyIntrinsicHeight: vi.fn(),
      uploadFile: vi.fn().mockResolvedValue({ fileId: "test-file-id" }),
      getFileDownloadUrl: vi
        .fn()
        .mockResolvedValue({ downloadUrl: "test-download-url" }),
    };

    const mockIframe = {
      contentWindow: mockIframeWindow,
    } as unknown as HTMLIFrameElement;

    const bridge = new MessageBridge(handlers);
    bridge.attach(mockIframe);

    const methodCall = {
      type: "AUI_METHOD_CALL",
      id: "state-123",
      method: "setWidgetState",
      args: [{ counter: 5, lastUpdated: "2024-01-01" }],
    };

    const messageEvent = new MessageEvent("message", {
      data: methodCall,
      source: mockIframeWindow,
    });

    window.dispatchEvent(messageEvent);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handlers.setWidgetState).toHaveBeenCalledWith({
      counter: 5,
      lastUpdated: "2024-01-01",
    });

    bridge.detach();
  });

  it("handles requestDisplayMode method call", async () => {
    const handlers = {
      callTool: vi.fn(),
      setWidgetState: vi.fn(),
      sendFollowUpMessage: vi.fn(),
      requestDisplayMode: vi
        .fn()
        .mockResolvedValue({ mode: "fullscreen" as const }),
      requestModal: vi.fn(),
      requestClose: vi.fn(),
      openExternal: vi.fn(),
      notifyIntrinsicHeight: vi.fn(),
      uploadFile: vi.fn().mockResolvedValue({ fileId: "test-file-id" }),
      getFileDownloadUrl: vi
        .fn()
        .mockResolvedValue({ downloadUrl: "test-download-url" }),
    };

    const mockIframe = {
      contentWindow: mockIframeWindow,
    } as unknown as HTMLIFrameElement;

    const bridge = new MessageBridge(handlers);
    bridge.attach(mockIframe);

    const methodCall = {
      type: "AUI_METHOD_CALL",
      id: "display-123",
      method: "requestDisplayMode",
      args: [{ mode: "fullscreen" }],
    };

    const messageEvent = new MessageEvent("message", {
      data: methodCall,
      source: mockIframeWindow,
    });

    window.dispatchEvent(messageEvent);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handlers.requestDisplayMode).toHaveBeenCalledWith({
      mode: "fullscreen",
    });

    expect(mockIframeWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUI_METHOD_RESPONSE",
        id: "display-123",
        result: { mode: "fullscreen" },
      }),
      "*",
    );

    bridge.detach();
  });
});
