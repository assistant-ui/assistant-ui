import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageBridge } from "../remote/message-bridge";
import type { MessageBridgeHandlers } from "../remote/message-bridge";
import type { File } from "node:buffer";

describe("File Handling Integration Tests", () => {
  let messageHandlers: Map<string, (event: MessageEvent) => void>;
  let mockIframeWindow: Window;

  // Mock File object for testing
  const createMockFile = (name: string, type: string, size: number): File =>
    ({
      name,
      type,
      size,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(size)),
      text: vi.fn().mockResolvedValue("mock file content"),
      stream: vi.fn().mockReturnValue(new ReadableStream()),
      lastModified: Date.now(),
      slice: vi.fn(),
      webkitRelativePath: "",
    }) as unknown as File;

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

  it("handles uploadFile method call", async () => {
    const mockFile = createMockFile("test.txt", "text/plain", 1024);
    const expectedFileId = "file-upload-123-abc";

    const handlers: MessageBridgeHandlers = {
      callTool: vi.fn(),
      setWidgetState: vi.fn(),
      sendFollowUpMessage: vi.fn(),
      requestDisplayMode: vi.fn(),
      requestModal: vi.fn(),
      requestClose: vi.fn(),
      openExternal: vi.fn(),
      notifyIntrinsicHeight: vi.fn(),
      uploadFile: vi.fn().mockResolvedValue({ fileId: expectedFileId }),
      getFileDownloadUrl: vi.fn(),
    };

    const mockIframe = {
      contentWindow: mockIframeWindow,
    } as unknown as HTMLIFrameElement;

    // Simulate file data as base64 string for iframe transport
    const fileBase64 = "dGVzdCBmaWxlIGNvbnRlbnQ="; // "test file content" in base64

    const bridge = new MessageBridge(handlers);
    bridge.attach(mockIframe);

    // Simulate uploadFile method call from iframe
    const methodCall = {
      type: "AUI_METHOD_CALL",
      id: "upload-123",
      method: "uploadFile",
      args: [
        {
          name: mockFile.name,
          type: mockFile.type,
          size: mockFile.size,
          data: fileBase64,
        },
      ],
    };

    const messageEvent = new MessageEvent("message", {
      data: methodCall,
      source: mockIframeWindow,
    });

    window.dispatchEvent(messageEvent);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handlers.uploadFile).toHaveBeenCalled();
    expect(mockIframeWindow.postMessage).toHaveBeenCalledWith(
      {
        type: "AUI_METHOD_RESPONSE",
        id: "upload-123",
        result: { fileId: expectedFileId },
      },
      "*",
    );

    bridge.detach();
  });

  it("handles getFileDownloadUrl method call", async () => {
    const fileId = "file-download-xyz-789";
    const expectedUrl = `https://example.com/files/download/${fileId}`;

    const handlers: MessageBridgeHandlers = {
      callTool: vi.fn(),
      setWidgetState: vi.fn(),
      sendFollowUpMessage: vi.fn(),
      requestDisplayMode: vi.fn(),
      requestModal: vi.fn(),
      requestClose: vi.fn(),
      openExternal: vi.fn(),
      notifyIntrinsicHeight: vi.fn(),
      uploadFile: vi.fn(),
      getFileDownloadUrl: vi
        .fn()
        .mockResolvedValue({ downloadUrl: expectedUrl }),
    };

    const mockIframe = {
      contentWindow: mockIframeWindow,
    } as unknown as HTMLIFrameElement;

    const bridge = new MessageBridge(handlers);
    bridge.attach(mockIframe);

    const methodCall = {
      type: "AUI_METHOD_CALL",
      id: "download-456",
      method: "getFileDownloadUrl",
      args: [{ fileId }],
    };

    const messageEvent = new MessageEvent("message", {
      data: methodCall,
      source: mockIframeWindow,
    });

    window.dispatchEvent(messageEvent);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handlers.getFileDownloadUrl).toHaveBeenCalledWith({ fileId });
    expect(mockIframeWindow.postMessage).toHaveBeenCalledWith(
      {
        type: "AUI_METHOD_RESPONSE",
        id: "download-456",
        result: { downloadUrl: expectedUrl },
      },
      "*",
    );

    bridge.detach();
  });

  it("handles uploadFile error response", async () => {
    const mockFile = createMockFile("error.txt", "text/plain", 512);
    const errorMessage = "File upload failed - size exceeded";

    const handlers: MessageBridgeHandlers = {
      callTool: vi.fn(),
      setWidgetState: vi.fn(),
      sendFollowUpMessage: vi.fn(),
      requestDisplayMode: vi.fn(),
      requestModal: vi.fn(),
      requestClose: vi.fn(),
      openExternal: vi.fn(),
      notifyIntrinsicHeight: vi.fn(),
      uploadFile: vi.fn().mockRejectedValue(new Error(errorMessage)),
      getFileDownloadUrl: vi.fn(),
    };

    const mockIframe = {
      contentWindow: mockIframeWindow,
    } as unknown as HTMLIFrameElement;

    const fileBase64 = "ZXJyb3IgZmlsZSBjb250ZW50"; // "error file content" in base64

    const bridge = new MessageBridge(handlers);
    bridge.attach(mockIframe);

    const methodCall = {
      type: "AUI_METHOD_CALL",
      id: "upload-error-789",
      method: "uploadFile",
      args: [
        {
          name: mockFile.name,
          type: mockFile.type,
          size: mockFile.size,
          data: fileBase64,
        },
      ],
    };

    const messageEvent = new MessageEvent("message", {
      data: methodCall,
      source: mockIframeWindow,
    });

    window.dispatchEvent(messageEvent);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handlers.uploadFile).toHaveBeenCalled();
    expect(mockIframeWindow.postMessage).toHaveBeenCalledWith(
      {
        type: "AUI_METHOD_RESPONSE",
        id: "upload-error-789",
        error: errorMessage,
      },
      "*",
    );

    bridge.detach();
  });

  it("handles getFileDownloadUrl error response", async () => {
    const fileId = "nonexistent-file-123";
    const errorMessage = "File not found";

    const handlers: MessageBridgeHandlers = {
      callTool: vi.fn(),
      setWidgetState: vi.fn(),
      sendFollowUpMessage: vi.fn(),
      requestDisplayMode: vi.fn(),
      requestModal: vi.fn(),
      requestClose: vi.fn(),
      openExternal: vi.fn(),
      notifyIntrinsicHeight: vi.fn(),
      uploadFile: vi.fn(),
      getFileDownloadUrl: vi.fn().mockRejectedValue(new Error(errorMessage)),
    };

    const mockIframe = {
      contentWindow: mockIframeWindow,
    } as unknown as HTMLIFrameElement;

    const bridge = new MessageBridge(handlers);
    bridge.attach(mockIframe);

    const methodCall = {
      type: "AUI_METHOD_CALL",
      id: "download-error-456",
      method: "getFileDownloadUrl",
      args: [{ fileId }],
    };

    const messageEvent = new MessageEvent("message", {
      data: methodCall,
      source: mockIframeWindow,
    });

    window.dispatchEvent(messageEvent);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(handlers.getFileDownloadUrl).toHaveBeenCalledWith({ fileId });
    expect(mockIframeWindow.postMessage).toHaveBeenCalledWith(
      {
        type: "AUI_METHOD_RESPONSE",
        id: "download-error-456",
        error: errorMessage,
      },
      "*",
    );

    bridge.detach();
  });
});
