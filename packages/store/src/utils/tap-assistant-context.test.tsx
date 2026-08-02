// @vitest-environment jsdom

import { useState } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { Derived } from "../Derived";
import { useAui } from "../useAui";
import { getClientId } from "./client-accessor";
import { AuiProvider } from "./react-assistant-context";
import {
  reportEffectError,
  useAssistantClientEffect,
  useAssistantTapContextProvider,
} from "./tap-assistant-context";

const errorListeners = new Set<(event: ErrorEvent) => void>();

const captureReportedErrors = (message: string) => {
  Object.defineProperty(globalThis, "reportError", {
    configurable: true,
    value: (error: unknown) => {
      window.dispatchEvent(
        new ErrorEvent("error", {
          error,
          message: error instanceof Error ? error.message : String(error),
        }),
      );
    },
  });
  const errors: unknown[] = [];
  const listener = (event: ErrorEvent) => {
    if (event.message !== message) return;
    event.preventDefault();
    errors.push(event.error);
  };
  errorListeners.add(listener);
  window.addEventListener("error", listener);

  return {
    errors,
    flush: () => new Promise<void>((resolve) => queueMicrotask(resolve)),
  };
};

const createRegistrationParent = (
  id: string,
  active: Map<string, string>,
  failValue?: string,
  operations?: string[],
) => {
  const registrationTarget = Object.assign(() => registrationTarget, {
    source: "root" as const,
    query: {},
    id,
    register: (value: string) => {
      operations?.push(`setup ${id} ${value}`);
      if (value === failValue) throw new Error(`registration failed for ${id}`);
      active.set(id, value);
      return () => {
        operations?.push(`cleanup ${id} ${value}`);
        if (active.get(id) === value) active.delete(id);
      };
    },
  });
  return {
    registrationTarget,
    subscribe: () => () => {},
    on: () => () => {},
  };
};

const useFailingRegistrationClient = ({
  migrations,
}: {
  migrations: string[];
}) => {
  useAssistantClientEffect(
    "registrationTarget" as any,
    (target: any) => target.register("primary"),
    [],
  );
  useAssistantClientEffect(
    "registrationTarget" as any,
    (target: any) => {
      migrations.push(target.id);
    },
    [],
  );
  return {};
};
const FailingRegistrationClient = resource(useFailingRegistrationClient);

const createClientEffectStore = (initialClient: object) => {
  let client = initialClient;
  const listeners = new Set<VoidFunction>();
  const store = {
    getValue: () => ({ client }),
    subscribe: (listener: VoidFunction) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  return {
    store,
    publish(nextClient: object) {
      client = nextClient;
      for (const listener of [...listeners]) listener();
    },
  };
};

const createClientEffectResource = (
  initialClient: object,
  store: ReturnType<typeof createClientEffectStore>["store"],
  setup: (target: any) => void | VoidFunction,
) => {
  const useEffectClient = () => {
    useAssistantClientEffect("registrationTarget" as any, setup, []);
    return {};
  };
  const useTestClient = () =>
    useAssistantTapContextProvider(
      {
        clientRef: { parent: initialClient, current: initialClient },
        clientStoreRef: { current: store },
        renderedClientRef: {
          current: {
            client: initialClient,
            effectClient: initialClient,
          },
        },
        emit: () => {},
      } as never,
      useEffectClient,
    );

  return resource(useTestClient);
};

const createThreadClient = (id: string) => {
  const useThreadClient = () => ({ getState: () => ({ id }) });
  return resource(useThreadClient);
};

const useThreadRegistrationClient = ({
  operations,
  value,
}: {
  operations: string[];
  value: string;
}) => {
  useAssistantClientEffect(
    "thread" as any,
    (thread: any) => {
      const { id } = thread().getState() as unknown as { id: string };
      operations.push(`setup ${id} ${value}`);
      return () => {
        const { id: cleanupId } = thread().getState() as unknown as {
          id: string;
        };
        operations.push(`cleanup ${cleanupId} ${value}`);
      };
    },
    [value],
  );
  return {};
};
const ThreadRegistrationClient = resource(useThreadRegistrationClient);

const useRetainedThreadClient = ({
  onSetup,
}: {
  onSetup: (thread: any) => void | VoidFunction;
}) => {
  useAssistantClientEffect("thread" as any, onSetup, []);
  return {};
};
const RetainedThreadClient = resource(useRetainedThreadClient);

describe("useAssistantClientEffect", () => {
  afterEach(() => {
    cleanup();
    for (const listener of errorListeners) {
      window.removeEventListener("error", listener);
    }
    errorListeners.clear();
    delete (globalThis as { reportError?: (error: unknown) => void })
      .reportError;
  });

  it("queues errors when reportError is unavailable", () => {
    const error = new Error("registration failed");
    let queued: VoidFunction | undefined;

    reportEffectError(error, {
      queueMicrotask: (callback) => {
        queued = callback;
      },
    });

    expect(queued).toBeTypeOf("function");
    expect(() => queued!()).toThrow(error);
  });

  it("uses the committed sibling accessor when scope and deps change together", () => {
    const operations: string[] = [];
    const ThreadA = createThreadClient("a");
    const ThreadB = createThreadClient("b");
    const threads = { a: ThreadA(), b: ThreadB() };

    const Harness = ({
      thread,
      value,
    }: {
      thread: keyof typeof threads | "unavailable";
      value: string;
    }) => {
      const registration = ThreadRegistrationClient({ operations, value });
      useAui(
        thread === "unavailable"
          ? ({ registration } as unknown as useAui.Props)
          : ({
              registration,
              thread: threads[thread],
            } as unknown as useAui.Props),
      );
      return null;
    };

    const { rerender, unmount } = render(<Harness thread="a" value="one" />);
    expect(operations).toEqual(["setup a one"]);

    rerender(<Harness thread="b" value="two" />);
    expect(operations).toEqual(["setup a one", "cleanup a one", "setup b two"]);

    rerender(<Harness thread="unavailable" value="two" />);
    expect(operations).toEqual([
      "setup a one",
      "cleanup a one",
      "setup b two",
      "cleanup b two",
    ]);

    rerender(<Harness thread="b" value="two" />);
    rerender(<Harness thread="b" value="three" />);
    unmount();
    expect(operations).toEqual([
      "setup a one",
      "cleanup a one",
      "setup b two",
      "cleanup b two",
      "setup b two",
      "cleanup b two",
      "setup b three",
      "cleanup b three",
    ]);
  });

  it("migrates when a sibling root resource is replaced", () => {
    const operations: string[] = [];
    const clientIds: ReturnType<typeof getClientId>[] = [];
    const ThreadA = createThreadClient("a");
    const ThreadB = createThreadClient("b");
    const threads = { a: ThreadA(), b: ThreadB() };

    const Harness = ({ thread }: { thread: keyof typeof threads }) => {
      useAui({
        registration: RetainedThreadClient({
          onSetup: (accessor) => {
            clientIds.push(getClientId(accessor));
            const { id } = accessor().getState() as { id: string };
            operations.push(`setup ${id} one`);
            return () => {
              const { id: cleanupId } = accessor().getState() as {
                id: string;
              };
              operations.push(`cleanup ${cleanupId} one`);
            };
          },
        }),
        thread: threads[thread],
      } as unknown as useAui.Props);
      return null;
    };

    const { rerender, unmount } = render(<Harness thread="a" />);
    rerender(<Harness thread="b" />);
    unmount();

    expect(operations).toEqual([
      "setup a one",
      "cleanup a one",
      "setup b one",
      "cleanup b one",
    ]);
    expect(clientIds[0]).not.toBe(clientIds[1]);
  });

  it("uses the current derived accessor for initial setup", () => {
    const operations: string[] = [];
    const ThreadA = createThreadClient("a");

    const Child = () => {
      useAui({
        registration: ThreadRegistrationClient({
          operations,
          value: "one",
        }),
        thread: Derived({
          source: "thread",
          query: {},
          get: (parent: any) => parent.thread,
        } as never),
      } as unknown as useAui.Props);
      return null;
    };
    const Parent = () => {
      const parent = useAui({
        thread: ThreadA(),
      } as unknown as useAui.Props);
      return (
        <AuiProvider value={parent}>
          <Child />
        </AuiProvider>
      );
    };

    const { unmount } = render(<Parent />);
    unmount();

    expect(operations).toEqual(["setup a one", "cleanup a one"]);
  });

  it("keeps an accessor retained by setup live after commit", () => {
    let retained: any;
    let setupClientId: ReturnType<typeof getClientId>;
    let cleanupClientId: ReturnType<typeof getClientId>;
    const useThreadClient = () => {
      const [id, setId] = useState("a");
      return { getState: () => ({ id }), setId };
    };
    const ThreadClient = resource(useThreadClient);

    const Harness = () => {
      useAui({
        registration: RetainedThreadClient({
          onSetup: (thread) => {
            retained = thread;
            setupClientId = getClientId(thread);
            return () => {
              cleanupClientId = getClientId(thread);
            };
          },
        }),
        thread: ThreadClient(),
      } as unknown as useAui.Props);
      return null;
    };

    const { unmount } = render(<Harness />);
    expect(retained.getState()).toEqual({ id: "a" });
    expect(getClientId(retained)).toBe(setupClientId!);

    act(() => flushTapSync(() => retained.setId("b")));
    expect(retained.getState()).toEqual({ id: "b" });
    expect(getClientId(retained)).toBe(setupClientId!);

    unmount();
    expect(cleanupClientId!).toBe(setupClientId!);
  });

  it("continues subscriber delivery and retries after a later structural update", async () => {
    const active = new Map<string, string>();
    const migrations: string[] = [];
    const operations: string[] = [];
    const b = createRegistrationParent("b", active, "primary", operations);
    const parents = {
      a: createRegistrationParent("a", active, undefined, operations),
      b,
      b2: { ...b },
      c: createRegistrationParent("c", active, undefined, operations),
    };

    const Child = () => {
      useAui({
        registration: FailingRegistrationClient({ migrations }),
      } as unknown as useAui.Props);
      return null;
    };
    const Harness = ({ parent }: { parent: keyof typeof parents }) => (
      <AuiProvider value={parents[parent] as never}>
        <Child />
      </AuiProvider>
    );

    const { rerender } = render(<Harness parent="a" />);
    expect(Object.fromEntries(active)).toEqual({ a: "primary" });
    expect(migrations).toEqual(["a"]);

    const reported = captureReportedErrors("registration failed for b");

    rerender(<Harness parent="b" />);
    await act(reported.flush);
    expect(active.size).toBe(0);
    expect(migrations).toEqual(["a", "b"]);
    expect(operations).toEqual([
      "setup a primary",
      "cleanup a primary",
      "setup b primary",
    ]);
    expect(reported.errors).toHaveLength(1);

    rerender(<Harness parent="b" />);
    await act(reported.flush);
    expect(operations).toEqual([
      "setup a primary",
      "cleanup a primary",
      "setup b primary",
    ]);
    expect(reported.errors).toHaveLength(1);

    rerender(<Harness parent="b2" />);
    await act(reported.flush);
    expect(operations).toEqual([
      "setup a primary",
      "cleanup a primary",
      "setup b primary",
      "setup b primary",
    ]);
    expect(migrations).toEqual(["a", "b"]);
    expect(reported.errors).toHaveLength(2);

    rerender(<Harness parent="c" />);
    expect(Object.fromEntries(active)).toEqual({ c: "primary" });
    expect(migrations).toEqual(["a", "b", "c"]);
  });

  it("throws an initial setup failure synchronously", () => {
    const operations: string[] = [];
    const clients = {
      a: createRegistrationParent("a", new Map()),
    };
    const clientStore = createClientEffectStore(clients.a);
    const Client = createClientEffectResource(
      clients.a,
      clientStore.store,
      (target) => {
        operations.push(`setup ${target.id}`);
        if (target.id === "a") throw new Error("registration failed for a");
        return () => operations.push(`cleanup ${target.id}`);
      },
    );
    const Host = () => {
      useAui({ registration: Client() } as unknown as useAui.Props);
      return null;
    };

    expect(() => render(<Host />)).toThrow("registration failed for a");
    expect(operations).toEqual(["setup a"]);
  });

  it("selects the latest accessor after cleanup publishes structurally", () => {
    const operations: string[] = [];
    const clients = {
      a: createRegistrationParent("a", new Map()),
      b: createRegistrationParent("b", new Map()),
      c: createRegistrationParent("c", new Map()),
    };
    const clientStore = createClientEffectStore(clients.a);
    const Client = createClientEffectResource(
      clients.a,
      clientStore.store,
      (target) => {
        operations.push(`setup ${target.id}`);
        return () => {
          operations.push(`cleanup ${target.id}`);
          if (target.id === "a") clientStore.publish(clients.c);
        };
      },
    );

    const Host = () => {
      useAui({ registration: Client() } as unknown as useAui.Props);
      return null;
    };

    render(<Host />);
    act(() => clientStore.publish(clients.b));

    expect(operations).toEqual(["setup a", "cleanup a", "setup c"]);
  });

  it("processes a structural publish from a failing setup", async () => {
    const operations: string[] = [];
    const clients = {
      a: createRegistrationParent("a", new Map()),
      b: createRegistrationParent("b", new Map()),
      c: createRegistrationParent("c", new Map()),
    };
    const clientStore = createClientEffectStore(clients.a);
    const Client = createClientEffectResource(
      clients.a,
      clientStore.store,
      (target) => {
        operations.push(`setup ${target.id}`);
        if (target.id === "b") {
          clientStore.publish(clients.c);
          throw new Error("registration failed for b");
        }
        return () => operations.push(`cleanup ${target.id}`);
      },
    );

    const Host = () => {
      useAui({ registration: Client() } as unknown as useAui.Props);
      return null;
    };

    render(<Host />);
    const reported = captureReportedErrors("registration failed for b");
    act(() => clientStore.publish(clients.b));
    await act(reported.flush);

    expect(operations).toEqual(["setup a", "cleanup a", "setup b", "setup c"]);
    expect(reported.errors).toHaveLength(1);
  });
});
