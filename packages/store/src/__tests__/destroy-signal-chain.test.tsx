// @vitest-environment jsdom

import { useState } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiConfig } from "../AuiConfig";
import { AuiProvider } from "../AuiProvider";
import type { AssistantClient } from "../types/client";
import { getClientDestroySignal } from "../utils/tap-assistant-context";

afterEach(cleanup);

const listenerCount = (
  add: { mock: { contexts: unknown[] } },
  remove: { mock: { contexts: unknown[] } },
  signal: AbortSignal,
) =>
  add.mock.contexts.filter((ctx) => ctx === signal).length -
  remove.mock.contexts.filter((ctx) => ctx === signal).length;

describe("host destroy signal chaining", () => {
  it("releases the abandoned parent's listener when a host is re-parented", () => {
    let setParent: ((parent: "a" | "b") => void) | undefined;
    let hostA: AssistantClient | null = null;
    let hostB: AssistantClient | null = null;

    const App = () => {
      const [a, setA] = useState<AssistantClient | null>(null);
      const [b, setB] = useState<AssistantClient | null>(null);
      const [parent, set] = useState<"a" | "b">("a");
      setParent = set;
      hostA = a;
      hostB = b;
      const target = parent === "a" ? a : b;
      return (
        <>
          <AuiProvider ref={setA} config={AuiConfig({})}>
            {null}
          </AuiProvider>
          <AuiProvider ref={setB} config={AuiConfig({})}>
            {null}
          </AuiProvider>
          {target && (
            <AuiProvider extends={target} config={AuiConfig({})}>
              {null}
            </AuiProvider>
          )}
        </>
      );
    };

    const add = vi.spyOn(AbortSignal.prototype, "addEventListener");
    const remove = vi.spyOn(AbortSignal.prototype, "removeEventListener");
    render(<App />);

    const signalA = getClientDestroySignal(hostA!)!;
    const signalB = getClientDestroySignal(hostB!)!;
    expect(signalA).toBeDefined();
    expect(signalB).toBeDefined();
    expect(signalA).not.toBe(signalB);

    // The nested host chains its own signal onto A's.
    expect(listenerCount(add, remove, signalA)).toBe(1);
    expect(listenerCount(add, remove, signalB)).toBe(0);

    // Both parents stay mounted, so nothing aborts the superseded chain: the
    // re-parented host has to release A's listener itself.
    act(() => setParent?.("b"));
    expect(listenerCount(add, remove, signalA)).toBe(0);
    expect(listenerCount(add, remove, signalB)).toBe(1);

    act(() => setParent?.("a"));
    expect(listenerCount(add, remove, signalA)).toBe(1);
    expect(listenerCount(add, remove, signalB)).toBe(0);

    add.mockRestore();
    remove.mockRestore();
  });
});
