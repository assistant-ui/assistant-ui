// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useStableRuntimeAdapters } from "./useRuntimeAdapters";
import type { RuntimeAdapters } from "../../runtimes/remote-thread-list/types";
import type { ThreadHistoryAdapter } from "../../adapters/thread-history";

const makeHistory = (): ThreadHistoryAdapter => ({
  load: async () => ({ messages: [] }),
  append: async () => {},
});

describe("useStableRuntimeAdapters", () => {
  it("keeps the previous bag when a fresh literal is shallow-equal", () => {
    const history = makeHistory();
    const { result, rerender } = renderHook(
      ({ adapters }: { adapters: RuntimeAdapters | null }) =>
        useStableRuntimeAdapters(adapters),
      { initialProps: { adapters: { history } } },
    );
    const first = result.current;

    rerender({ adapters: { history } });

    expect(result.current).toBe(first);
  });

  it("adopts the new bag when a field changes", () => {
    const first = makeHistory();
    const second = makeHistory();
    const { result, rerender } = renderHook(
      ({ adapters }: { adapters: RuntimeAdapters | null }) =>
        useStableRuntimeAdapters(adapters),
      { initialProps: { adapters: { history: first } } },
    );

    rerender({ adapters: { history: second } });

    expect(result.current?.history).toBe(second);
  });

  it("moves between null and a bag", () => {
    const history = makeHistory();
    const { result, rerender } = renderHook(
      ({ adapters }: { adapters: RuntimeAdapters | null }) =>
        useStableRuntimeAdapters(adapters),
      { initialProps: { adapters: null as RuntimeAdapters | null } },
    );
    expect(result.current).toBeNull();

    rerender({ adapters: { history } });
    expect(result.current?.history).toBe(history);

    rerender({ adapters: null });
    expect(result.current).toBeNull();

    rerender({ adapters: {} });
    expect(result.current).not.toBeNull();
    expect(result.current).toEqual({});
  });
});
