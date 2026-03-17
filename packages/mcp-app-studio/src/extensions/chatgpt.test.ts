import { describe, it, expect, afterEach, vi } from "vitest";
import type { ExtendedBridge } from "../core/bridge";
import { MCP_CAPABILITIES } from "../core/capabilities";
import { withChatGPTExtensions } from "./chatgpt";

function createBaseBridge(): ExtendedBridge {
  return {
    platform: "mcp",
    capabilities: MCP_CAPABILITIES,
    async connect() {},
    getHostContext() {
      return null;
    },
    onToolInput() {
      return () => {};
    },
    onToolResult() {
      return () => {};
    },
    onHostContextChanged() {
      return () => {};
    },
    async callTool() {
      return { content: [] };
    },
    async openLink() {},
    async requestDisplayMode() {
      return "inline";
    },
    sendSizeChanged() {},
  };
}

describe("withChatGPTExtensions", () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it("returns the base bridge when window.openai is missing", () => {
    globalThis.window = {
      location: { search: "" },
    } as unknown as Window & typeof globalThis;

    const base = createBaseBridge();
    expect(withChatGPTExtensions(base)).toBe(base);
  });

  it("adds widget state helpers when window.openai is present", () => {
    const setWidgetState = vi.fn();
    const openai = {
      widgetState: { a: 1 },
      setWidgetState,
    };
    globalThis.window = { openai } as unknown as Window & typeof globalThis;

    const bridge = withChatGPTExtensions(createBaseBridge());

    expect(bridge.capabilities.widgetState).toBe(true);
    expect(bridge.getWidgetState?.()).toEqual({ a: 1 });

    bridge.setWidgetState?.({ b: 2 });
    expect(setWidgetState).toHaveBeenCalledWith({ b: 2 });
  });

  it("adds file helpers when window.openai exposes them", async () => {
    const uploadFile = vi.fn(async () => ({ fileId: "file_1" }));
    const getFileDownloadUrl = vi.fn(async () => ({
      downloadUrl: "https://example.com/file",
    }));
    const openai = {
      widgetState: null,
      setWidgetState: vi.fn(),
      uploadFile,
      getFileDownloadUrl,
    };
    globalThis.window = { openai } as unknown as Window & typeof globalThis;

    const bridge = withChatGPTExtensions(createBaseBridge());

    expect(bridge.capabilities.fileUpload).toBe(true);
    expect(bridge.capabilities.fileDownload).toBe(true);

    await bridge.uploadFile?.({} as unknown as File);
    expect(uploadFile).toHaveBeenCalledTimes(1);

    await bridge.getFileDownloadUrl?.("file_1");
    expect(getFileDownloadUrl).toHaveBeenCalledWith({ fileId: "file_1" });
  });
});
