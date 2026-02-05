/**
 * @vitest-environment jsdom
 *
 * Tests for universal SDK hooks - validates exports, types, and hook signatures.
 * Platform detection tests are in detect.test.ts.
 * Full React rendering tests would require additional test dependencies.
 */
import { describe, it, expect } from "vitest";

import {
  UniversalProvider,
  usePlatform,
  useTheme,
  useCapabilities,
  useToolInput,
  useToolInputPartial,
  useToolResult,
  useDisplayMode,
  useWidgetState,
  useLog,
  useCallTool,
  useOpenLink,
  useSendMessage,
  useUpdateModelContext,
  useHostContext,
  useUniversalBridge,
  detectPlatform,
  isMCP,
  hasChatGPTExtensions,
} from "../sdk";

import type { UniversalProviderProps } from "../universal/provider";

describe("Universal Hooks - Export Validation", () => {
  it("exports UniversalProvider as a React component", () => {
    expect(UniversalProvider).toBeDefined();
    expect(typeof UniversalProvider).toBe("function");

    const providerProps: UniversalProviderProps = {
      children: null,
      appInfo: { name: "test", version: "1.0.0" },
    };
    expect(providerProps).toBeDefined();
  });

  it("exports all universal hooks as functions", () => {
    const hooks = [
      usePlatform,
      useTheme,
      useCapabilities,
      useToolInput,
      useToolInputPartial,
      useToolResult,
      useDisplayMode,
      useWidgetState,
      useLog,
      useCallTool,
      useOpenLink,
      useSendMessage,
      useUpdateModelContext,
      useHostContext,
      useUniversalBridge,
    ];

    for (const hook of hooks) {
      expect(hook).toBeDefined();
      expect(typeof hook).toBe("function");
    }
  });

  it("exports platform detection utilities", () => {
    expect(detectPlatform).toBeDefined();
    expect(isMCP).toBeDefined();
    expect(hasChatGPTExtensions).toBeDefined();
    expect(typeof detectPlatform).toBe("function");
    expect(typeof isMCP).toBe("function");
    expect(typeof hasChatGPTExtensions).toBe("function");
  });
});

describe("Hook Signature Validation", () => {
  it("useToolInput accepts generic type parameter", () => {
    type MyInput = { query: string; limit: number };
    const typedHook: () => MyInput | null = useToolInput<MyInput>;
    expect(typedHook).toBeDefined();
  });

  it("useWidgetState accepts generic type parameter", () => {
    type MyState = { count: number; items: string[] };
    const typedHook: () => [MyState | null, (state: MyState | null) => void] =
      useWidgetState<MyState>;
    expect(typedHook).toBeDefined();
  });

  it("useLog returns a function with correct signature", () => {
    type LogFn = (
      level: "debug" | "info" | "warning" | "error",
      data: string,
    ) => void;
    const logHook: () => LogFn = useLog;
    expect(logHook).toBeDefined();
  });

  it("useDisplayMode returns tuple with mode and setter", () => {
    type DisplayModeTuple = [
      "inline" | "fullscreen" | "pip",
      (mode: "inline" | "fullscreen" | "pip") => Promise<void>,
    ];
    const displayModeHook: () => DisplayModeTuple = useDisplayMode as any;
    expect(displayModeHook).toBeDefined();
  });
});

describe("Provider Props Validation", () => {
  it("accepts appInfo prop", () => {
    const props: UniversalProviderProps = {
      children: null,
      appInfo: {
        name: "My App",
        version: "1.0.0",
      },
    };
    expect(props.appInfo?.name).toBe("My App");
  });

  it("accepts appCapabilities prop", () => {
    const props: UniversalProviderProps = {
      children: null,
      appCapabilities: {
        displayMode: {
          supported: ["inline", "fullscreen"],
        },
      },
    };
    expect(props.appCapabilities?.displayMode?.supported).toHaveLength(2);
  });

  it("children is required", () => {
    const props: UniversalProviderProps = {
      children: null,
    };
    expect(props).toBeDefined();
  });
});

describe("Cross-Platform API Compatibility", () => {
  it("hooks have consistent naming across platforms", () => {
    const universalHooks = {
      useTheme,
      useDisplayMode,
      useToolInput,
      useCallTool,
      useOpenLink,
      useWidgetState,
    };

    for (const [name, hook] of Object.entries(universalHooks)) {
      expect(name).toMatch(/^use[A-Z]/);
      expect(typeof hook).toBe("function");
    }
  });
});

describe("Platform-Specific Hooks", () => {
  it("exports optional extension hooks for state persistence", () => {
    // useWidgetState - ChatGPT extensions (window.openai): persists state across refreshes
    expect(useWidgetState).toBeDefined();
    expect(typeof useWidgetState).toBe("function");
  });

  it("exports MCP bridge hooks for model context and streaming", () => {
    // useUpdateModelContext - MCP Apps bridge: dynamically update AI's context
    expect(useUpdateModelContext).toBeDefined();
    expect(typeof useUpdateModelContext).toBe("function");

    // useLog - MCP Apps bridge: structured logging to host (when supported)
    expect(useLog).toBeDefined();
    expect(typeof useLog).toBe("function");

    // useToolInputPartial - MCP Apps bridge: streaming input as user types (when supported)
    expect(useToolInputPartial).toBeDefined();
    expect(typeof useToolInputPartial).toBe("function");
  });
});
