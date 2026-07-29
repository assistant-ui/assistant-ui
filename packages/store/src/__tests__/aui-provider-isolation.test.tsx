// @vitest-environment jsdom

import type { ReactNode } from "react";
import { useState } from "react";
import { cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resource } from "@assistant-ui/tap";
import { AuiProvider } from "../utils/react-assistant-context";
import { useAui } from "../useAui";
import type { AssistantClient } from "../types/client";

type AnyClient = Record<string, any>;

const useCounterClient = () => {
  const [count] = useState(0);
  return { getState: () => ({ count }) };
};
const CounterClient = resource(useCounterClient);

const OuterProvider = ({ children }: { children: ReactNode }) => {
  const aui = useAui({ thread: CounterClient() } as unknown as useAui.Props);
  return <AuiProvider value={aui}>{children}</AuiProvider>;
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AuiProvider value={null} isolation boundary", () => {
  it("hides an outer provider's scopes behind the boundary", () => {
    let aui!: AnyClient;
    const Consumer = () => {
      aui = useAui();
      return null;
    };

    render(
      <OuterProvider>
        <AuiProvider value={null}>
          <Consumer />
        </AuiProvider>
      </OuterProvider>,
    );

    expect(() => aui.thread.getState()).toThrow(
      'Scope "thread" is not available inside this isolation boundary (<AuiProvider value={null}>).',
    );
  });

  it("clients built under the boundary do not inherit outer scopes", () => {
    let aui!: AnyClient;
    const Builder = () => {
      aui = useAui({ composer: CounterClient() } as unknown as useAui.Props);
      return null;
    };

    render(
      <OuterProvider>
        <AuiProvider value={null}>
          <Builder />
        </AuiProvider>
      </OuterProvider>,
    );

    expect(aui.composer.getState()).toEqual({ count: 0 });
    expect(() => aui.thread.getState()).toThrow(
      /Scope "thread" is not available inside this isolation boundary/,
    );
  });

  it("outside any provider, missing scopes still ask for an AuiProvider", () => {
    let aui!: AnyClient;
    const Consumer = () => {
      aui = useAui();
      return null;
    };

    render(<Consumer />);

    expect(() => aui.thread.getState()).toThrow(
      /Wrap your component in an <AuiProvider> component/,
    );
  });
});

describe("useAui hook-count stability", () => {
  const expectNoHookOrderViolation = (
    consoleError: ReturnType<typeof vi.spyOn>,
  ) => {
    const hookOrderMessages = consoleError.mock.calls.filter((args) =>
      args.some(
        (arg) => typeof arg === "string" && arg.includes("order of Hooks"),
      ),
    );
    expect(hookOrderMessages).toEqual([]);
  };

  it("plain read stays stable across re-renders", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const wrapper = ({ children }: { children: ReactNode }) => (
      <OuterProvider>{children}</OuterProvider>
    );
    const { result, rerender } = renderHook(() => useAui(), { wrapper });
    const first = result.current;
    rerender();
    rerender();

    expect(result.current).toBe(first);
    expectNoHookOrderViolation(consoleError);
  });

  it("build form stays stable when the config argument appears and disappears", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const clients = { thread: CounterClient() } as unknown as useAui.Props;
    const { result, rerender } = renderHook(
      ({
        config,
      }: {
        config: { parent: null | AssistantClient } | undefined;
      }) => (config ? useAui(clients, config) : useAui(clients)),
      { initialProps: { config: undefined } as any },
    );
    const first = result.current;

    rerender({ config: { parent: null } });
    rerender({ config: undefined });
    rerender({ config: { parent: null } });

    expect(result.current).toBe(first);
    expectNoHookOrderViolation(consoleError);
  });

  it("explicit-parent form stays stable when the parent changes", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    let parentA!: AssistantClient;
    let parentB!: AssistantClient;
    const Parents = () => {
      parentA = useAui({ thread: CounterClient() } as unknown as useAui.Props);
      parentB = useAui({ thread: CounterClient() } as unknown as useAui.Props);
      return null;
    };
    render(<Parents />);

    const clients = { composer: CounterClient() } as unknown as useAui.Props;
    const { result, rerender } = renderHook(
      ({ parent }: { parent: AssistantClient }) => useAui(clients, { parent }),
      { initialProps: { parent: parentA } },
    );

    expect((result.current as AnyClient).thread.getState()).toEqual({
      count: 0,
    });
    rerender({ parent: parentB });
    expect((result.current as AnyClient).composer.getState()).toEqual({
      count: 0,
    });
    expectNoHookOrderViolation(consoleError);
  });
});
