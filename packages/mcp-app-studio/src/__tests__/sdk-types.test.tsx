/**
 * @vitest-environment jsdom
 *
 * Tests for SDK exports and type compatibility.
 * Platform detection tests are in detect.test.ts.
 */
import { describe, it, expect } from "vitest";

import {
  UniversalProvider,
  useUniversalBridge,
  usePlatform,
  detectPlatform,
  isMCP,
  hasChatGPTExtensions,
  useHostContext,
  useTheme,
  useCapabilities,
  useToolInput,
  useToolInputPartial,
  useToolResult,
  useDisplayMode,
  useCallTool,
  useOpenLink,
  useSendMessage,
  useUpdateModelContext,
  useWidgetState,
  useLog,
  textBlock,
  imageBlock,
  MCP_CAPABILITIES,
} from "../sdk";

import type {
  Platform,
  DisplayMode,
  Theme,
  ContentBlock,
  TextContentBlock,
  ImageContentBlock,
  ToolResult,
} from "../core/types";

import type { HostCapabilities } from "../core/capabilities";

describe("SDK Exports", () => {
  it("exports UniversalProvider component", () => {
    expect(UniversalProvider).toBeDefined();
    expect(typeof UniversalProvider).toBe("function");
  });

  it("exports platform detection functions", () => {
    expect(detectPlatform).toBeDefined();
    expect(isMCP).toBeDefined();
    expect(hasChatGPTExtensions).toBeDefined();
    expect(typeof detectPlatform).toBe("function");
    expect(typeof isMCP).toBe("function");
    expect(typeof hasChatGPTExtensions).toBe("function");
  });

  it("exports all universal hooks", () => {
    expect(useUniversalBridge).toBeDefined();
    expect(usePlatform).toBeDefined();
    expect(useHostContext).toBeDefined();
    expect(useTheme).toBeDefined();
    expect(useCapabilities).toBeDefined();
    expect(useToolInput).toBeDefined();
    expect(useToolInputPartial).toBeDefined();
    expect(useToolResult).toBeDefined();
    expect(useDisplayMode).toBeDefined();
    expect(useCallTool).toBeDefined();
    expect(useOpenLink).toBeDefined();
    expect(useSendMessage).toBeDefined();
    expect(useUpdateModelContext).toBeDefined();
    expect(useWidgetState).toBeDefined();
    expect(useLog).toBeDefined();
  });

  it("exports content block helpers", () => {
    expect(textBlock).toBeDefined();
    expect(imageBlock).toBeDefined();

    const text = textBlock("hello");
    expect(text.type).toBe("text");
    expect(text.text).toBe("hello");

    const image = imageBlock("base64data", "image/png");
    expect(image.type).toBe("image");
    expect(image.data).toBe("base64data");
    expect(image.mimeType).toBe("image/png");
  });

  it("exports capability constants", () => {
    expect(MCP_CAPABILITIES).toBeDefined();

    expect(MCP_CAPABILITIES.callTool).toBe(true);
    expect(MCP_CAPABILITIES.modelContext).toBe(true);
  });
});

describe("Type Compatibility", () => {
  it("Platform type includes expected values", () => {
    const platforms: Platform[] = ["mcp", "unknown"];
    expect(platforms).toHaveLength(2);
  });

  it("DisplayMode type includes expected values", () => {
    const modes: DisplayMode[] = ["inline", "fullscreen", "pip"];
    expect(modes).toHaveLength(3);
  });

  it("Theme type includes expected values", () => {
    const themes: Theme[] = ["light", "dark"];
    expect(themes).toHaveLength(2);
  });

  it("ContentBlock types are valid", () => {
    const text: TextContentBlock = { type: "text", text: "hello" };
    const image: ImageContentBlock = {
      type: "image",
      data: "base64",
      mimeType: "image/png",
    };

    const blocks: ContentBlock[] = [text, image];
    expect(blocks).toHaveLength(2);
  });

  it("ToolResult type is valid", () => {
    const result: ToolResult = {
      content: [{ type: "text", text: "result" }],
      isError: false,
    };
    expect(result.content).toHaveLength(1);
  });

  it("HostCapabilities type matches expected shape", () => {
    const caps: HostCapabilities = MCP_CAPABILITIES;
    expect(caps.callTool).toBeDefined();
    expect(caps.openLink).toBeDefined();
    expect(caps.displayModes).toBeDefined();
    expect(caps.sendMessage).toBeDefined();
    expect(caps.modelContext).toBeDefined();
    expect(caps.logging).toBeDefined();
  });
});
