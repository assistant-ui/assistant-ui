// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import type { AssistantClient } from "@assistant-ui/store";
import { describe, expect, it, vi } from "vitest";
import {
  shallowEqualRecords,
  useModelContextSnapshot,
  type ModelContextSnapshotSource,
} from "./useModelContextSnapshot";

const EMPTY: Readonly<Record<string, string>> = Object.freeze({});

const createSource = (
  overrides: Partial<
    ModelContextSnapshotSource<Readonly<Record<string, string>>>
  > = {},
) => {
  const listeners = new Set<() => void>();
  const state = { tools: EMPTY as Record<string, string> };
  const unsubscribe = vi.fn();
  const source: ModelContextSnapshotSource<Readonly<Record<string, string>>> = {
    empty: EMPTY,
    read: vi.fn(() => ({ ...state.tools })),
    subscribe: vi.fn((_aui, onChange) => {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
        unsubscribe();
      };
    }),
    isEqual: shallowEqualRecords,
    ...overrides,
  };
  return {
    source,
    state,
    unsubscribe,
    notify: () => listeners.forEach((listener) => listener()),
  };
};

const aui = {} as AssistantClient;

describe("useModelContextSnapshot", () => {
  it("seeds from the source on the first render when enabled", () => {
    const { source } = createSource();
    (source.read as ReturnType<typeof vi.fn>).mockReturnValue({ a: "1" });

    const { result } = renderHook(() =>
      useModelContextSnapshot(aui, true, source),
    );

    expect(result.current).toEqual({ a: "1" });
  });

  it("neither reads nor subscribes while disabled", () => {
    const { source } = createSource();

    const { result } = renderHook(() =>
      useModelContextSnapshot(aui, false, source),
    );

    expect(result.current).toBe(source.empty);
    expect(source.read).not.toHaveBeenCalled();
    expect(source.subscribe).not.toHaveBeenCalled();
  });

  it("keeps the previous reference when isEqual reports no change", () => {
    const { source, state, notify } = createSource();
    state.tools = { a: "1" };

    const { result } = renderHook(() =>
      useModelContextSnapshot(aui, true, source),
    );
    const first = result.current;

    act(() => {
      state.tools = { a: "1" };
      notify();
    });
    expect(result.current).toBe(first);

    act(() => {
      state.tools = { a: "2" };
      notify();
    });
    expect(result.current).not.toBe(first);
    expect(result.current).toEqual({ a: "2" });
  });

  it("takes every notification when the source omits isEqual", () => {
    const { source, state, notify } = createSource({ isEqual: undefined });
    state.tools = { a: "1" };

    const { result } = renderHook(() =>
      useModelContextSnapshot(aui, true, source),
    );
    const first = result.current;

    act(() => notify());

    expect(result.current).not.toBe(first);
    expect(result.current).toEqual({ a: "1" });
  });

  it("unsubscribes on unmount", () => {
    const { source, unsubscribe } = createSource();
    const { unmount } = renderHook(() =>
      useModelContextSnapshot(aui, true, source),
    );

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});

describe("shallowEqualRecords", () => {
  it("compares own keys by identity", () => {
    expect(shallowEqualRecords({ a: 1 }, { a: 1 })).toBe(true);
    expect(shallowEqualRecords({ a: 1 }, { a: 2 })).toBe(false);
    expect(shallowEqualRecords({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(shallowEqualRecords({ a: undefined }, { b: undefined })).toBe(false);
  });

  it("does not match a key inherited from Object.prototype", () => {
    expect(
      shallowEqualRecords({ toString: Object.prototype.toString }, { a: 1 }),
    ).toBe(false);
  });
});
