import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageBridge } from "../remote/message-bridge";
import { DEFAULT_GLOBALS } from "../runtime/bridge-script";

describe("OpenAI Namespace Compatibility Integration", () => {
  let mockIframeWindow: Window;
  let receivedMessages: unknown[];

  beforeEach(() => {
    receivedMessages = [];
    mockIframeWindow = {
      postMessage: vi.fn((data: unknown) => {
        receivedMessages.push(data);
      }),
    } as unknown as Window;
  });

  it("globals include previousDisplayMode and view", () => {
    expect(DEFAULT_GLOBALS).toHaveProperty("previousDisplayMode", null);
    expect(DEFAULT_GLOBALS).toHaveProperty("view", null);
  });

  it("sends globals with new properties", () => {
    const handlers = {
      callTool: vi.fn(),
      setWidgetState: vi.fn(),
      sendFollowUpMessage: vi.fn(),
      requestDisplayMode: vi.fn(),
      requestModal: vi.fn(),
      requestClose: vi.fn(),
      openExternal: vi.fn(),
      notifyIntrinsicHeight: vi.fn(),
      uploadFile: vi.fn().mockResolvedValue({ fileId: "test" }),
      getFileDownloadUrl: vi.fn().mockResolvedValue({ downloadUrl: "test" }),
    };

    const mockIframe = {
      contentWindow: mockIframeWindow,
    } as unknown as HTMLIFrameElement;

    const bridge = new MessageBridge(handlers);
    bridge.attach(mockIframe);

    const globalsWithView = {
      ...DEFAULT_GLOBALS,
      previousDisplayMode: "inline" as const,
      view: { mode: "modal" as const, params: { title: "Test" } },
    };

    bridge.sendGlobals(globalsWithView);

    expect(mockIframeWindow.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "AUI_SET_GLOBALS",
        globals: expect.objectContaining({
          previousDisplayMode: "inline",
          view: { mode: "modal", params: { title: "Test" } },
        }),
      }),
      "*",
    );

    bridge.detach();
  });
});
