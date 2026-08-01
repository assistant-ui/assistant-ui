// @vitest-environment jsdom

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiProvider } from "../utils/react-assistant-context";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import {
  useAssistantClientEffect,
  useAssistantTapContextProvider,
} from "../utils/tap-assistant-context";

const makeTestClient = (log: string[]) => {
  // Runs inside the tap host; "react" imports route to tap's dispatcher.
  const useTestClient = () => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      log.push("tap effect");
      return () => {
        log.push("tap cleanup");
      };
    }, []);
    return {
      getState: () => ({ count }),
      setCount: (n: number) => setCount(n),
    };
  };
  return resource(useTestClient);
};

const Provider = ({
  client,
  children,
}: {
  client: ReturnType<ReturnType<typeof makeTestClient>>;
  children: ReactNode;
}) => {
  const aui = useAui({ thread: client } as unknown as useAui.Props);
  return <AuiProvider value={aui}>{children}</AuiProvider>;
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

const createUnavailableRegistrationParent = () => ({
  registrationTarget: Object.assign(
    () => {
      throw new Error("registrationTarget scope not available");
    },
    { source: null as const, query: {} },
  ),
  subscribe: () => () => {},
  on: () => () => {},
});

const useRegistrationClient = ({ value }: { value: string }) => {
  useAssistantClientEffect(
    "registrationTarget" as any,
    (target: any) => target.register(value),
    [value],
  );
  return {};
};
const RegistrationClient = resource(useRegistrationClient);

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
        renderedClientRef: { current: initialClient },
        emit: () => {},
      } as never,
      useEffectClient,
    );

  return resource(useTestClient);
};

const captureQueuedErrors = (message: string) => {
  const errors: unknown[] = [];
  const queue = globalThis.queueMicrotask;
  vi.spyOn(globalThis, "queueMicrotask").mockImplementation((callback) => {
    queue(() => {
      try {
        callback();
      } catch (error) {
        if (error instanceof Error && error.message === message) {
          errors.push(error);
          return;
        }
        throw error;
      }
    });
  });

  return {
    errors,
    flush: () => new Promise<void>((resolve) => queue(resolve)),
  };
};

describe("useAui tap host", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("commits client effects passively, ahead of consumer effects", () => {
    const log: string[] = [];
    const TestClient = makeTestClient(log);

    function Consumer() {
      useLayoutEffect(() => {
        log.push("consumer layout");
      }, []);
      useEffect(() => {
        log.push("consumer effect");
      }, []);
      return null;
    }

    render(
      <Provider client={TestClient()}>
        <Consumer />
      </Provider>,
    );

    // "consumer layout" first: the commit no longer blocks paint.
    // "tap effect" before "consumer effect": AuiProvider mounts the host's
    // commit ahead of its children's effects, with no opt-in by the child.
    expect(log).toEqual(["consumer layout", "tap effect", "consumer effect"]);
  });

  it("commits via the host's own fallback without an AuiProvider", () => {
    const log: string[] = [];
    const TestClient = makeTestClient(log);
    const client = TestClient();

    function HostOnly() {
      useAui({ thread: client } as unknown as useAui.Props);
      return null;
    }

    render(<HostOnly />);
    expect(log).toEqual(["tap effect"]);
  });

  it("keeps tap effect metadata outside the client object", () => {
    const TestClient = makeTestClient([]);
    let aui!: ReturnType<typeof useAui>;

    function Host() {
      aui = useAui({
        thread: TestClient(),
      } as unknown as useAui.Props);
      return null;
    }

    render(<Host />);
    expect(Object.getOwnPropertySymbols(aui)).toEqual([]);
  });

  it("updates flow through to useAuiState consumers", () => {
    const log: string[] = [];
    const TestClient = makeTestClient(log);

    let api!: { setCount: (n: number) => void };
    let observed!: number;
    function Consumer() {
      const aui = useAui();
      api = (aui as any).thread;
      observed = useAuiState((s) => (s as any).thread.count);
      return null;
    }

    render(
      <Provider client={TestClient()}>
        <Consumer />
      </Provider>,
    );
    expect(observed).toBe(0);

    act(() => flushTapSync(() => api.setCount(7)));
    expect(observed).toBe(7);
  });

  it("cleans up client effects when the host unmounts", () => {
    const log: string[] = [];
    const TestClient = makeTestClient(log);

    const { unmount } = render(
      <Provider client={TestClient()}>{null}</Provider>,
    );
    unmount();
    expect(log).toEqual(["tap effect", "tap cleanup"]);
  });

  it("migrates selected client effects after structural scope changes", () => {
    const active = new Map<string, string>();
    const operations: string[] = [];
    const parents = {
      a: createRegistrationParent("a", active, undefined, operations),
      b: createRegistrationParent("b", active, undefined, operations),
      unavailable: createUnavailableRegistrationParent(),
    };

    const Child = ({ value }: { value: string }) => {
      useAui({
        registration: RegistrationClient({ value }),
      } as unknown as useAui.Props);
      return null;
    };
    const Harness = ({
      parent,
      value,
    }: {
      parent: keyof typeof parents;
      value: string;
    }) => (
      <AuiProvider value={parents[parent] as never}>
        <Child value={value} />
      </AuiProvider>
    );

    const { rerender, unmount } = render(<Harness parent="a" value="one" />);
    expect(Object.fromEntries(active)).toEqual({ a: "one" });
    expect(operations).toEqual(["setup a one"]);

    rerender(<Harness parent="b" value="two" />);
    expect(Object.fromEntries(active)).toEqual({ b: "two" });
    expect(operations).toEqual(["setup a one", "cleanup a one", "setup b two"]);

    rerender(<Harness parent="unavailable" value="two" />);
    expect(active.size).toBe(0);

    rerender(<Harness parent="b" value="two" />);
    expect(Object.fromEntries(active)).toEqual({ b: "two" });

    rerender(<Harness parent="b" value="three" />);
    expect(Object.fromEntries(active)).toEqual({ b: "three" });

    unmount();
    expect(active.size).toBe(0);
  });

  it("continues subscriber delivery and retries after a later structural update", async () => {
    const active = new Map<string, string>();
    const migrations: string[] = [];
    const operations: string[] = [];
    const parents = {
      a: createRegistrationParent("a", active, undefined, operations),
      b: createRegistrationParent("b", active, "primary", operations),
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

    const reported = captureQueuedErrors("registration failed for b");

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

    rerender(<Harness parent="c" />);
    expect(Object.fromEntries(active)).toEqual({ c: "primary" });
    expect(migrations).toEqual(["a", "b", "c"]);
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
    const reported = captureQueuedErrors("registration failed for b");
    act(() => clientStore.publish(clients.b));
    await act(reported.flush);

    expect(operations).toEqual(["setup a", "cleanup a", "setup b", "setup c"]);
    expect(reported.errors).toHaveLength(1);
  });
});
