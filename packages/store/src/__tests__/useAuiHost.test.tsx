// @vitest-environment jsdom

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiProvider } from "../utils/react-assistant-context";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";
import { useAssistantClientEffect } from "../utils/tap-assistant-context";

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

const createRegistrationParent = (id: string, active: Map<string, string>) => {
  const registrationTarget = Object.assign(() => registrationTarget, {
    source: "root" as const,
    query: {},
    register: (value: string) => {
      active.set(id, value);
      return () => {
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

describe("useAui tap host", () => {
  afterEach(() => {
    cleanup();
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
    const parents = {
      a: createRegistrationParent("a", active),
      b: createRegistrationParent("b", active),
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

    rerender(<Harness parent="b" value="two" />);
    expect(Object.fromEntries(active)).toEqual({ b: "two" });

    rerender(<Harness parent="unavailable" value="two" />);
    expect(active.size).toBe(0);

    rerender(<Harness parent="b" value="two" />);
    expect(Object.fromEntries(active)).toEqual({ b: "two" });

    rerender(<Harness parent="b" value="three" />);
    expect(Object.fromEntries(active)).toEqual({ b: "three" });

    unmount();
    expect(active.size).toBe(0);
  });
});
