// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";

const { extrasRef } = vi.hoisted(() => ({
  extrasRef: { current: undefined as unknown },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAuiState: ((selector: (s: unknown) => unknown) =>
    selector({
      thread: { extras: extrasRef.current },
    })) as typeof import("@assistant-ui/store").useAuiState,
}));

import { acpExtras } from "./acpExtras";
import {
  useAcpAgentCapabilities,
  useAcpAgentInfo,
  useAcpAvailableCommands,
  useAcpConfigOptions,
  useAcpConnectionState,
  useAcpCurrentModeId,
  useAcpPlan,
  useAcpSessionId,
  useAcpSessionTitle,
  useAcpUsage,
} from "./hooks";
import type { AcpExtras } from "./types";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

const renderHookValue = <T,>(useHook: () => T): T => {
  let captured!: T;
  const Probe = () => {
    captured = useHook();
    return null;
  };
  const container = document.createElement("div");
  root = createRoot(container);
  act(() => {
    root!.render(createElement(Probe));
  });
  return captured;
};

const provideExtras = (over: Partial<AcpExtras> = {}) =>
  acpExtras.provide({
    connectionState: "connected",
    sessionId: "s1",
    agentInfo: { name: "agent", version: "1.0.0" },
    agentCapabilities: { loadSession: true },
    plan: [{ content: "step", priority: "high", status: "pending" }],
    sessionTitle: "My session",
    currentModeId: "code",
    availableCommands: [{ name: "help", description: "Show help" }],
    configOptions: [],
    usage: { used: 1, size: 10, cost: null },
    ...over,
  });

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  extrasRef.current = undefined;
});

describe("react-acp hooks", () => {
  it("reads every accessor from the runtime extras", () => {
    extrasRef.current = provideExtras();

    expect(renderHookValue(useAcpConnectionState)).toBe("connected");
    expect(renderHookValue(useAcpSessionId)).toBe("s1");
    expect(renderHookValue(useAcpAgentInfo)).toEqual({
      name: "agent",
      version: "1.0.0",
    });
    expect(renderHookValue(useAcpAgentCapabilities)).toEqual({
      loadSession: true,
    });
    expect(renderHookValue(useAcpPlan)).toEqual([
      { content: "step", priority: "high", status: "pending" },
    ]);
    expect(renderHookValue(useAcpSessionTitle)).toBe("My session");
    expect(renderHookValue(useAcpCurrentModeId)).toBe("code");
    expect(renderHookValue(useAcpAvailableCommands)).toEqual([
      { name: "help", description: "Show help" },
    ]);
    expect(renderHookValue(useAcpConfigOptions)).toEqual([]);
    expect(renderHookValue(useAcpUsage)).toEqual({
      used: 1,
      size: 10,
      cost: null,
    });
  });

  it("falls back when no ACP runtime is active", () => {
    extrasRef.current = undefined;

    expect(renderHookValue(useAcpConnectionState)).toBe("disconnected");
    expect(renderHookValue(useAcpSessionId)).toBeUndefined();
    expect(renderHookValue(useAcpAgentInfo)).toBeUndefined();
    expect(renderHookValue(useAcpAgentCapabilities)).toBeUndefined();
    expect(renderHookValue(useAcpPlan)).toBeUndefined();
    expect(renderHookValue(useAcpSessionTitle)).toBeUndefined();
    expect(renderHookValue(useAcpCurrentModeId)).toBeUndefined();
    expect(renderHookValue(useAcpAvailableCommands)).toBeUndefined();
    expect(renderHookValue(useAcpConfigOptions)).toBeUndefined();
    expect(renderHookValue(useAcpUsage)).toBeUndefined();
  });

  it("falls back when the extras belong to another runtime", () => {
    extrasRef.current = { connectionState: "connected" };

    expect(renderHookValue(useAcpConnectionState)).toBe("disconnected");
    expect(renderHookValue(useAcpSessionId)).toBeUndefined();
  });

  it("reports values the agent never sent as undefined", () => {
    extrasRef.current = provideExtras({
      sessionId: undefined,
      plan: undefined,
      usage: undefined,
    });

    expect(renderHookValue(useAcpConnectionState)).toBe("connected");
    expect(renderHookValue(useAcpSessionId)).toBeUndefined();
    expect(renderHookValue(useAcpPlan)).toBeUndefined();
    expect(renderHookValue(useAcpUsage)).toBeUndefined();
  });
});
