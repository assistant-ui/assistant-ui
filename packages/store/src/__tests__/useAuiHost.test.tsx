// @vitest-environment jsdom

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useState } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiProvider } from "../utils/react-assistant-context";
import { useAui } from "../useAui";
import { useAuiState } from "../useAuiState";

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

  it("updates flow through to useAuiState consumers", () => {
    const log: string[] = [];
    const TestClient = makeTestClient(log);

    let api!: { setCount: (n: number) => void };
    let observed!: number;
    function Consumer() {
      const aui = useAui();
      api = (aui as any).thread();
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
});
