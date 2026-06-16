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

import { useLangChainError } from "./useStreamRuntime";

// The real guard symbol in useStreamRuntime is module-private. To stand in for
// runtime-produced extras, we use a Proxy whose `has` trap claims any symbol
// with the description "langchain-runtime-extras" is present.
const makeExtrasWith = (obj: Record<string, unknown>) =>
  new Proxy(obj, {
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

describe("useLangChainError", () => {
  it("returns undefined when extras are absent", () => {
    runSelectorAgainst(undefined);
    const { result } = renderHook(() => useLangChainError());
    expect(result.current).toBeUndefined();
  });

  it("returns the error value when extras carry error", () => {
    const error = new Error("boom");
    runSelectorAgainst(makeExtrasWith({ error }));
    const { result } = renderHook(() => useLangChainError());
    expect(result.current).toBe(error);
  });

  it("returns undefined when extras carry no error", () => {
    runSelectorAgainst(makeExtrasWith({ error: undefined }));
    const { result } = renderHook(() => useLangChainError());
    expect(result.current).toBeUndefined();
  });
});
