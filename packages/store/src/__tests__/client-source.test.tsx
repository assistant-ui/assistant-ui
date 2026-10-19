// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { resource } from "@assistant-ui/tap";
import { AuiConfig } from "../AuiConfig";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { unstable_useClientSource } from "../client";
import type { AssistantClient } from "../types/client";

declare module "../types/client" {
  interface ScopeRegistry {
    sourceCounter: {
      methods: {
        getState: () => { count: number };
        setCount: (count: number) => void;
      };
    };
  }
}

it("wakes only the source client's reader once per external change", () => {
  let snapshot = { count: 0 };
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const setCount = (count: number) => {
    snapshot = { count };
    for (const listener of [...listeners]) listener();
  };
  const useSourceCounter = () => {
    unstable_useClientSource(subscribe);
    return { getState: () => snapshot, setCount };
  };
  const SourceCounter = resource(useSourceCounter);
  const rendered: number[] = [];
  let aui!: AssistantClient;
  const Reader = () => {
    aui = useAui();
    rendered.push(useAuiState((state) => state.sourceCounter.count));
    return null;
  };

  render(
    <AuiProvider config={AuiConfig({ sourceCounter: SourceCounter() })}>
      <Reader />
    </AuiProvider>,
  );
  const broad = vi.fn();
  const unsubscribe = aui.subscribe(broad);
  expect(rendered).toEqual([0]);

  act(() => {
    aui.sourceCounter.setCount(1);
    expect(broad).not.toHaveBeenCalled();
  });
  expect(rendered).toEqual([0, 1]);

  act(() => {
    aui.sourceCounter.setCount(2);
  });
  expect(rendered).toEqual([0, 1, 2]);
  unsubscribe();
});

afterEach(cleanup);
