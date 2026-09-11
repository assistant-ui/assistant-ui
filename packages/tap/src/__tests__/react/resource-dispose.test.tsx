import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Activity, Component, StrictMode, type ReactNode } from "react";
import {
  resource,
  flushTapSync,
  useResource,
  useResourceDispose,
  useResources,
  useTapHost,
  useTapRoot,
  withKey,
} from "../../index";
import { useState as useTapState } from "../../react-hooks/useState";

type Counter = {
  count: number;
  setCount: (count: number) => void;
};

const hostKinds = [
  "useResource",
  "useResources",
  "useTapRoot",
  "useTapHost",
] as const;

type HostKind = (typeof hostKinds)[number];

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override render() {
    return this.state.error ? (
      <div role="alert">{this.state.error.message}</div>
    ) : (
      this.props.children
    );
  }
}

const createHosts = (
  dispose: () => void,
  setRead: (read: () => Counter) => void,
): Record<HostKind, () => null> => {
  const useTracked = () => {
    const [count, setCount] = useTapState(0);
    useResourceDispose(dispose);
    return { count, setCount };
  };
  const Tracked = resource(useTracked);

  function ResourceHost() {
    const value = useResource(Tracked());
    setRead(() => value);
    return null;
  }

  function ResourcesHost() {
    const [value] = useResources([withKey("tracked", Tracked())]);
    setRead(() => value!);
    return null;
  }

  function TapRootHost() {
    const root = useTapRoot(function TrackedRoot() {
      return useTracked();
    });
    setRead(root.getValue);
    return null;
  }

  function TapHostHost() {
    const { value } = useTapHost(function TrackedHost() {
      return useTracked();
    });
    setRead(() => value);
    return null;
  }

  return {
    useResource: ResourceHost,
    useResources: ResourcesHost,
    useTapRoot: TapRootHost,
    useTapHost: TapHostHost,
  };
};

describe("useResourceDispose in React hosts", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it.each(hostKinds)(
    "%s preserves resources while Activity is hidden and disposes on deletion",
    (hostKind) => {
      const dispose = vi.fn();
      let read!: () => Counter;
      const Host = createHosts(dispose, (nextRead) => {
        read = nextRead;
      })[hostKind];
      function App({ hidden }: { hidden: boolean }) {
        return (
          <Activity mode={hidden ? "hidden" : "visible"}>
            <Host />
          </Activity>
        );
      }

      const { rerender, unmount } = render(<App hidden={false} />);
      expect(read().count).toBe(0);

      rerender(<App hidden={true} />);
      expect(dispose).not.toHaveBeenCalled();
      act(() => {
        if (hostKind === "useTapRoot") {
          flushTapSync(() => read().setCount(1));
        } else {
          read().setCount(1);
        }
      });

      rerender(<App hidden={false} />);
      expect(read().count).toBe(1);
      expect(dispose).not.toHaveBeenCalled();

      unmount();
      expect(dispose).toHaveBeenCalledOnce();
    },
  );

  it.each(hostKinds)(
    "%s disposes when deleted while Activity remains hidden",
    async (hostKind) => {
      const dispose = vi.fn();
      const Host = createHosts(dispose, () => {})[hostKind];
      function App({ hidden }: { hidden: boolean }) {
        return (
          <Activity mode={hidden ? "hidden" : "visible"}>
            <Host />
          </Activity>
        );
      }

      const { rerender, unmount } = render(<App hidden={false} />);
      rerender(<App hidden={true} />);
      expect(dispose).not.toHaveBeenCalled();

      unmount();
      await vi.waitFor(() => expect(dispose).toHaveBeenCalledOnce());
    },
  );

  it("disposes a direct React host deleted while Activity remains hidden", async () => {
    const dispose = vi.fn();
    function Host() {
      useResourceDispose(dispose);
      return null;
    }
    function App({ hidden }: { hidden: boolean }) {
      return (
        <Activity mode={hidden ? "hidden" : "visible"}>
          <Host />
        </Activity>
      );
    }

    const { rerender, unmount } = render(<App hidden={false} />);
    rerender(<App hidden={true} />);
    expect(dispose).not.toHaveBeenCalled();

    unmount();
    await vi.waitFor(() => expect(dispose).toHaveBeenCalledOnce());
  });

  it.each(hostKinds)(
    "%s does not dispose during a StrictMode mount replay",
    (hostKind) => {
      const dispose = vi.fn();
      const Host = createHosts(dispose, () => {})[hostKind];

      const { unmount } = render(
        <StrictMode>
          <Host />
        </StrictMode>,
      );

      expect(dispose).not.toHaveBeenCalled();
      unmount();
      expect(dispose).toHaveBeenCalledOnce();
    },
  );

  it("routes direct React-host disposal errors through React", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    function Host() {
      useResourceDispose(() => {
        throw new Error("dispose failed");
      });
      return null;
    }
    function App({ show }: { show: boolean }) {
      return <ErrorBoundary>{show ? <Host /> : null}</ErrorBoundary>;
    }

    const { rerender } = render(<App show={true} />);
    rerender(<App show={false} />);

    expect(screen.getByRole("alert").textContent).toBe("dispose failed");
  });

  it("routes hidden React-host disposal errors through React", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    function Host() {
      useResourceDispose(() => {
        throw new Error("hidden dispose failed");
      });
      return null;
    }
    function App({ hidden, show }: { hidden: boolean; show: boolean }) {
      return (
        <ErrorBoundary>
          {show ? (
            <Activity mode={hidden ? "hidden" : "visible"}>
              <Host />
            </Activity>
          ) : null}
        </ErrorBoundary>
      );
    }

    const { rerender } = render(<App hidden={false} show={true} />);
    rerender(<App hidden={true} show={true} />);
    rerender(<App hidden={true} show={false} />);

    expect(screen.getByRole("alert").textContent).toBe("hidden dispose failed");
  });

  it.each(hostKinds)(
    "%s routes hidden resource disposal errors through React",
    (hostKind) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const Host = createHosts(
        () => {
          throw new Error("hidden resource dispose failed");
        },
        () => {},
      )[hostKind];
      function App({ hidden, show }: { hidden: boolean; show: boolean }) {
        return (
          <ErrorBoundary>
            {show ? (
              <Activity mode={hidden ? "hidden" : "visible"}>
                <Host />
              </Activity>
            ) : null}
          </ErrorBoundary>
        );
      }

      const { rerender } = render(<App hidden={false} show={true} />);
      rerender(<App hidden={true} show={true} />);
      rerender(<App hidden={true} show={false} />);

      expect(screen.getByRole("alert").textContent).toBe(
        "hidden resource dispose failed",
      );
    },
  );
});
