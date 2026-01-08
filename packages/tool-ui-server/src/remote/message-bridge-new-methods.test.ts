import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MessageBridge, MessageBridgeHandlers } from "./message-bridge";

describe("MessageBridge - New File Methods", () => {
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

  it("handles uploadFile method call correctly", async () => {
    const methodCall = {
      type: "AUI_METHOD_CALL",
      id: "upload-123",
      method: "uploadFile" as const,
      args: [
        {
          name: "test.txt",
          type: "text/plain",
          size: 1024,
          data: "dGVzdCBmaWxlIGNvbnRlbnQ=", // base64 encoded content
        },
      ],
    };

    const messageEvent = new MessageEvent("message", {
      data: methodCall,
      source: mockContentWindow,
    });

    window.dispatchEvent(messageEvent);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handlers.uploadFile).toHaveBeenCalled();
    expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
      {
        type: "AUI_METHOD_RESPONSE",
        id: "upload-123",
        result: { fileId: "test-file-id" },
      },
      "*",
    );
  });

  it("handles getFileDownloadUrl method call correctly", async () => {
    const methodCall = {
      type: "AUI_METHOD_CALL",
      id: "download-456",
      method: "getFileDownloadUrl" as const,
      args: [{ fileId: "file-abc-123" }],
    };

    const messageEvent = new MessageEvent("message", {
      data: methodCall,
      source: mockContentWindow,
    });

    window.dispatchEvent(messageEvent);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handlers.getFileDownloadUrl).toHaveBeenCalledWith({
      fileId: "file-abc-123",
    });
    expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
      {
        type: "AUI_METHOD_RESPONSE",
        id: "download-456",
        result: { downloadUrl: "test-download-url" },
      },
      "*",
    );
  });

  it("handles uploadFile error response correctly", async () => {
    const errorMessage = "File upload failed - size exceeded";
    handlers.uploadFile = vi.fn().mockRejectedValue(new Error(errorMessage));

    const methodCall = {
      type: "AUI_METHOD_CALL",
      id: "upload-error-789",
      method: "uploadFile" as const,
      args: [
        {
          name: "large-file.txt",
          type: "text/plain",
          size: 104857600, // 100MB
          data: "bGFyZ2UgZmlsZSBkYXRh", // base64 encoded content
        },
      ],
    };

    const messageEvent = new MessageEvent("message", {
      data: methodCall,
      source: mockContentWindow,
    });

    window.dispatchEvent(messageEvent);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
      {
        type: "AUI_METHOD_RESPONSE",
        id: "upload-error-789",
        error: errorMessage,
      },
      "*",
    );
  });

  it("handles getFileDownloadUrl error response correctly", async () => {
    const errorMessage = "File not found";
    handlers.getFileDownloadUrl = vi
      .fn()
      .mockRejectedValue(new Error(errorMessage));

    const methodCall = {
      type: "AUI_METHOD_CALL",
      id: "download-error-456",
      method: "getFileDownloadUrl" as const,
      args: [{ fileId: "nonexistent-file" }],
    };

    const messageEvent = new MessageEvent("message", {
      data: methodCall,
      source: mockContentWindow,
    });

    window.dispatchEvent(messageEvent);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockContentWindow.postMessage).toHaveBeenCalledWith(
      {
        type: "AUI_METHOD_RESPONSE",
        id: "download-error-456",
        error: errorMessage,
      },
      "*",
    );
  });
});
