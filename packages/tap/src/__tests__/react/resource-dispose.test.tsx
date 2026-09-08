import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { Activity, StrictMode } from "react";
import {
  resource,
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
  afterEach(cleanup);

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
      act(() => read().setCount(1));

      rerender(<App hidden={false} />);
      expect(read().count).toBe(1);
      expect(dispose).not.toHaveBeenCalled();

      unmount();
      expect(dispose).toHaveBeenCalledOnce();
    },
  );

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
});
