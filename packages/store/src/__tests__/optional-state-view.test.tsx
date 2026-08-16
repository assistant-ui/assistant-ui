// @vitest-environment jsdom

import { useState } from "react";
import { cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resource } from "@assistant-ui/tap";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { AuiProvider } from "../AuiProvider";
import { getProxiedAssistantState } from "../utils/proxied-assistant-state";
import type { AssistantClient } from "../types/client";

type AnyClient = Record<string, any>;
type AnyState = Record<string, any>;

const useThreadClient = () => {
  const [title] = useState("hello");
  return {
    getState: () => ({ title }),
  };
};

const ThreadClient = resource(useThreadClient);

const setup = () => {
  let aui!: AnyClient;
  const Harness = () => {
    aui = useAui({ thread: ThreadClient() } as unknown as useAui.Props);
    return null;
  };
  render(<Harness />);
  return aui as AssistantClient;
};

afterEach(() => {
  cleanup();
});

describe("optional state view", () => {
  it("mirrors the base state for registered scopes", () => {
    const aui = setup();
    const s = getProxiedAssistantState(aui) as AnyState;

    expect(s.optional.thread).toEqual(s.thread);
    expect(s.optional.thread.title).toBe("hello");
  });

  it("resolves unavailable scopes to undefined while the base state throws", () => {
    const aui = setup();
    const s = getProxiedAssistantState(aui) as AnyState;

    expect(s.optional.threadListItem).toBeUndefined();
    expect(s.optional.threadListItem?.remoteId).toBeUndefined();
    expect(s.optional.notARegisteredScope).toBeUndefined();
    expect(() => s.threadListItem.remoteId).toThrow(
      'The current scope does not have a "threadListItem" property.',
    );
  });

  it("resolves scopes to undefined outside an AuiProvider", () => {
    const { result } = renderHook(() =>
      useAuiState((s: AnyState) => s.optional.thread?.title),
    );

    expect(result.current).toBeUndefined();
  });

  it("reflects the optional key in the has and ownKeys traps", () => {
    const aui = setup();
    const s = getProxiedAssistantState(aui) as AnyState;

    expect("optional" in s).toBe(true);
    expect(Reflect.ownKeys(s)).toContain("optional");
    expect(Reflect.ownKeys(s)).toContain("thread");
    expect("optional" in s.optional).toBe(false);
  });

  it("useAuiState selects optional fields of unavailable scopes as undefined", () => {
    const aui = setup();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuiProvider value={aui}>{children}</AuiProvider>
    );

    const { result } = renderHook(
      () => useAuiState((s: AnyState) => s.optional.threadListItem?.remoteId),
      { wrapper },
    );

    expect(result.current).toBeUndefined();
  });

  it("useAuiState throws when selecting the optional view wholesale", () => {
    const aui = setup();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuiProvider value={aui}>{children}</AuiProvider>
    );

    expect(() => {
      renderHook(() => useAuiState((s: AnyState) => s.optional), { wrapper });
    }).toThrow(
      "You tried to return the entire AssistantState. This is not supported due to technical limitations.",
    );
  });
});
