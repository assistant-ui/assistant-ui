import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { detectPlatform, isChatGPT, isMCP } from "./detect";

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
