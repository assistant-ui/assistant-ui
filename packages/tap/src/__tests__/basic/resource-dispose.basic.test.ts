import { afterEach, describe, expect, it, vi } from "vitest";
import { resource } from "../../core/resource";
import {
  disposeResourceFiber,
  unmountResourceFiber,
} from "../../core/ResourceFiber";
import { createTapRoot } from "../../core/createTapRoot";
import { flushTapSync } from "../../core/scheduler";
import { withKey } from "../../core/withKey";
import { useResource } from "../../hooks/useResource";
import { useResourceDispose } from "../../hooks/useResourceDispose";
import { useResources } from "../../hooks/useResources";
import { useTapHost } from "../../hooks/useTapHost";
import { useTapRoot } from "../../hooks/useTapRoot";
import { useEffect } from "../../react-hooks/useEffect";
import { useState } from "../../react-hooks/useState";
import {
  cleanupAllResources,
  createTestResource,
  renderTest,
  waitForNextTick,
} from "../test-utils";

describe("resource disposal", () => {
  afterEach(cleanupAllResources);

  it("disposes the previous hook when useResource replaces it", () => {
    const disposeFirst = vi.fn();
    const disposeSecond = vi.fn();
    const First = resource(function useFirst() {
      useResourceDispose(disposeFirst);
    });
    const Second = resource(function useSecond() {
      useResourceDispose(disposeSecond);
    });
    const parent = createTestResource((second: boolean) =>
      useResource(second ? Second() : First()),
    );

    renderTest(parent, false);
    renderTest(parent, true);

    expect(disposeFirst).toHaveBeenCalledOnce();
    expect(disposeSecond).not.toHaveBeenCalled();
  });

  it("disposes nested resources with their owner", () => {
    const disposeInner = vi.fn();
    const Inner = resource(function useInner() {
      useResourceDispose(disposeInner);
    });
    const First = resource(function useFirst() {
      return useResource(Inner());
    });
    const Second = resource(function useSecond() {});
    const parent = createTestResource((second: boolean) =>
      useResource(second ? Second() : First()),
    );

    renderTest(parent, false);
    renderTest(parent, true);

    expect(disposeInner).toHaveBeenCalledOnce();
  });

  it.each(["useResource", "useResources", "useTapRoot", "useTapHost"] as const)(
    "disposes %s children after their owner was soft-unmounted",
    (hostKind) => {
      const dispose = vi.fn();
      const Child = resource(function useChild() {
        useResourceDispose(dispose);
      });
      const useResourceHost = () => useResource(Child());
      const useResourcesHost = () => useResources([withKey("child", Child())]);
      const useTapRootHost = () =>
        useTapRoot(function ChildRoot() {
          useResourceDispose(dispose);
        });
      const useTapHostHost = () =>
        useTapHost(function ChildHost() {
          useResourceDispose(dispose);
        });
      const hosts = {
        useResource: useResourceHost,
        useResources: useResourcesHost,
        useTapRoot: useTapRootHost,
        useTapHost: useTapHostHost,
      };
      const owner = createTestResource(hosts[hostKind]);

      renderTest(owner);
      unmountResourceFiber(owner);
      expect(dispose).not.toHaveBeenCalled();

      disposeResourceFiber(owner);
      expect(dispose).toHaveBeenCalledOnce();
    },
  );

  it("disposes keyed resources when they are replaced or removed", () => {
    const disposeFirst = vi.fn();
    const disposeSecond = vi.fn();
    const First = resource(function useFirst() {
      useResourceDispose(disposeFirst);
    });
    const Second = resource(function useSecond() {
      useResourceDispose(disposeSecond);
    });
    const parent = createTestResource((state: "first" | "second" | "removed") =>
      useResources(
        state === "removed"
          ? []
          : [withKey("item", state === "first" ? First() : Second())],
      ),
    );

    renderTest(parent, "first");
    renderTest(parent, "second");
    expect(disposeFirst).toHaveBeenCalledOnce();
    expect(disposeSecond).not.toHaveBeenCalled();

    renderTest(parent, "removed");
    expect(disposeSecond).toHaveBeenCalledOnce();
  });

  it("disposes an explicitly unmounted root", () => {
    const dispose = vi.fn();
    const root = createTapRoot(function Root() {
      useResourceDispose(dispose);
    });

    root.unmount();

    expect(dispose).toHaveBeenCalledOnce();
  });

  it("does not re-run cleanup or setup after cleanup disposes its root", () => {
    const setup = vi.fn();
    let root: { unmount: () => void } | undefined;
    const effectCleanup = vi.fn(() => root?.unmount());
    let setVersion!: (version: number) => void;
    root = createTapRoot(function Root() {
      const [version, set] = useState(0);
      setVersion = set;
      useEffect(() => {
        setup();
        return effectCleanup;
      }, [version]);
    });
    setup.mockClear();
    effectCleanup.mockClear();

    flushTapSync(() => setVersion(1));

    expect(effectCleanup).toHaveBeenCalledOnce();
    expect(setup).not.toHaveBeenCalled();
  });

  it("preserves disposal callbacks across mount-on-subscribe soft unmounts", async () => {
    const dispose = vi.fn();
    const root = createTapRoot(
      function Root() {
        useResourceDispose(dispose);
      },
      { mountOnSubscribe: true },
    );

    const unsubscribe = root.subscribe(() => {});
    unsubscribe();
    await waitForNextTick();
    expect(dispose).not.toHaveBeenCalled();

    const unsubscribeAgain = root.subscribe(() => {});
    expect(dispose).not.toHaveBeenCalled();
    unsubscribeAgain();
    await waitForNextTick();
    expect(dispose).not.toHaveBeenCalled();
  });
});
