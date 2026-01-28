import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  detectPlatform,
  detectPlatformDetailed,
  isChatGPT,
  isMCP,
  enableDebugMode,
  disableDebugMode,
} from "./detect";

type MockWindow = {
  location?: { search: string };
  frameElement?: Element | null;
  openai?: unknown;
  __MCP_HOST__?: boolean;
};

describe("detectPlatform", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    const mockWindow: MockWindow = {
      location: { search: "" },
      frameElement: null,
    };
    globalThis.window = mockWindow as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it("should return unknown when window is undefined", () => {
    globalThis.window = undefined as unknown as Window & typeof globalThis;

    expect(detectPlatform()).toBe("unknown");
  });

  it("should return chatgpt when window.openai exists", () => {
    const mockWindow: MockWindow = {
      location: { search: "" },
      frameElement: null,
      openai: {},
    };
    globalThis.window = mockWindow as unknown as Window & typeof globalThis;

    expect(detectPlatform()).toBe("chatgpt");
  });

  it("should return mcp when mcp-host URL param exists", () => {
    const mockWindow: MockWindow = {
      location: { search: "?mcp-host=true" },
      frameElement: null,
    };
    globalThis.window = mockWindow as unknown as Window & typeof globalThis;

    expect(detectPlatform()).toBe("mcp");
  });

  it("should return mcp when __MCP_HOST__ property exists", () => {
    const mockWindow: MockWindow = {
      location: { search: "" },
      frameElement: null,
      __MCP_HOST__: true,
    };
    globalThis.window = mockWindow as unknown as Window & typeof globalThis;

    expect(detectPlatform()).toBe("mcp");
  });

  it("should return unknown when no markers are present", () => {
    expect(detectPlatform()).toBe("unknown");
  });

  it("should prioritize ChatGPT over MCP markers", () => {
    const mockWindow: MockWindow = {
      location: { search: "" },
      frameElement: null,
      openai: {},
      __MCP_HOST__: true,
    };
    globalThis.window = mockWindow as unknown as Window & typeof globalThis;

    expect(detectPlatform()).toBe("chatgpt");
  });
});

describe("isChatGPT", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    const mockWindow: MockWindow = {
      location: { search: "" },
      frameElement: null,
    };
    globalThis.window = mockWindow as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it("should return true when on ChatGPT", () => {
    const mockWindow: MockWindow = {
      location: { search: "" },
      frameElement: null,
      openai: {},
    };
    globalThis.window = mockWindow as unknown as Window & typeof globalThis;

    expect(isChatGPT()).toBe(true);
  });

  it("should return false when not on ChatGPT", () => {
    expect(isChatGPT()).toBe(false);
  });
});

describe("isMCP", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    const mockWindow: MockWindow = {
      location: { search: "" },
      frameElement: null,
    };
    globalThis.window = mockWindow as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it("should return true when on MCP", () => {
    const mockWindow: MockWindow = {
      location: { search: "" },
      frameElement: null,
      __MCP_HOST__: true,
    };
    globalThis.window = mockWindow as unknown as Window & typeof globalThis;

    expect(isMCP()).toBe(true);
  });

  it("should return false when not on MCP", () => {
    expect(isMCP()).toBe(false);
  });
});

describe("detectPlatformDetailed", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    const mockWindow: MockWindow = {
      location: { search: "" },
      frameElement: null,
    };
    globalThis.window = mockWindow as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it("should return detailed result with detection method for ChatGPT", () => {
    const mockWindow: MockWindow = {
      location: { search: "" },
      frameElement: null,
      openai: {},
    };
    globalThis.window = mockWindow as unknown as Window & typeof globalThis;

    const result = detectPlatformDetailed();
    expect(result.platform).toBe("chatgpt");
    expect(result.detectedBy).toBe("window.openai");
    expect(result.checks.windowOpenai).toBe(true);
  });

  it("should return detailed result for MCP URL param", () => {
    const mockWindow: MockWindow = {
      location: { search: "?mcp-host=true" },
      frameElement: null,
    };
    globalThis.window = mockWindow as unknown as Window & typeof globalThis;

    const result = detectPlatformDetailed();
    expect(result.platform).toBe("mcp");
    expect(result.detectedBy).toContain("URL param");
    expect(result.checks.mcpUrlParam).toBe(true);
  });

  it("should return detailed result for MCP window property", () => {
    const mockWindow: MockWindow = {
      location: { search: "" },
      frameElement: null,
      __MCP_HOST__: true,
    };
    globalThis.window = mockWindow as unknown as Window & typeof globalThis;

    const result = detectPlatformDetailed();
    expect(result.platform).toBe("mcp");
    expect(result.detectedBy).toContain("__MCP_HOST__");
    expect(result.checks.mcpWindowProp).toBe(true);
  });

  it("should return all check flags for debugging", () => {
    const result = detectPlatformDetailed();
    expect(result.checks).toHaveProperty("windowOpenai");
    expect(result.checks).toHaveProperty("mcpUrlParam");
    expect(result.checks).toHaveProperty("mcpWindowProp");
    expect(result.checks).toHaveProperty("mcpDataAttr");
  });

  it("should return unknown with no detectedBy when no markers found", () => {
    const result = detectPlatformDetailed();
    expect(result.platform).toBe("unknown");
    expect(result.detectedBy).toBeNull();
    expect(result.checks.windowOpenai).toBe(false);
    expect(result.checks.mcpUrlParam).toBe(false);
    expect(result.checks.mcpWindowProp).toBe(false);
    expect(result.checks.mcpDataAttr).toBe(false);
  });
});

describe("debug mode", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    const mockWindow: MockWindow = {
      location: { search: "" },
      frameElement: null,
    };
    globalThis.window = mockWindow as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    disableDebugMode();
    globalThis.window = originalWindow;
  });

  it("enableDebugMode sets window debug flag", () => {
    enableDebugMode();
    expect(
      (globalThis.window as unknown as Record<string, unknown>)[
        "__CHATGPT_APP_DEBUG__"
      ],
    ).toBe(true);
  });

  it("disableDebugMode clears window debug flag", () => {
    enableDebugMode();
    disableDebugMode();
    expect(
      (globalThis.window as unknown as Record<string, unknown>)[
        "__CHATGPT_APP_DEBUG__"
      ],
    ).toBe(false);
  });
});
