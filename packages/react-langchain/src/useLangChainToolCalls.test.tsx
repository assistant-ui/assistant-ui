// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

type Selector = (state: unknown) => unknown;
const { mockUseAuiState } = vi.hoisted(() => ({
  mockUseAuiState: vi.fn(),
}));

vi.mock(import("@assistant-ui/store"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useAuiState: ((selector: Selector) =>
      mockUseAuiState(selector)) as typeof actual.useAuiState,
    useAui: (() => ({})) as unknown as typeof actual.useAui,
  };
});

import { useLangChainToolCalls } from "./useStreamRuntime";

// The real guard symbol in useStreamRuntime is module-private. To stand in for
// runtime-produced extras, we use a Proxy whose `has` trap claims any symbol
// with the description "langchain-runtime-extras" is present.
const makeExtrasWith = (props: Record<string, unknown>) =>
  new Proxy(props, {
    has: (target, key) =>
      (typeof key === "symbol" &&
        key.description === "langchain-runtime-extras") ||
      Reflect.has(target, key),
  });

const runSelectorAgainst = (extras: unknown) => {
  mockUseAuiState.mockImplementationOnce((selector: Selector) =>
    selector({ thread: { extras } }),
  );
};

describe("useLangChainToolCalls", () => {
  it("returns an empty array when extras are absent", () => {
    runSelectorAgainst(undefined);
    const { result } = renderHook(() => useLangChainToolCalls());
    expect(result.current).toEqual([]);
  });

  it("returns the assembled tool calls from extras", () => {
    const toolCalls = [{ id: "a", name: "search", args: { q: "x" } }];
    runSelectorAgainst(makeExtrasWith({ toolCalls }));
    const { result } = renderHook(() => useLangChainToolCalls());
    expect(result.current).toBe(toolCalls);
  });
});
