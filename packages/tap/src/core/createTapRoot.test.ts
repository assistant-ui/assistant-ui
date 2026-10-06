import { describe, expect, it, vi } from "vitest";
import { createTapRoot } from "./createTapRoot";
import { flushTapSync, scheduleTask } from "./scheduler";

const outerEffect = vi.hoisted(() => ({ setup: () => () => {} }));

vi.mock("../hooks/useTapRoot", async (importOriginal) => {
  const original = await importOriginal<typeof import("../hooks/useTapRoot")>();
  const { useInsertionEffect } =
    await import("../react-hooks/useInsertionEffect");
  return {
    ...original,
    useTapRoot: <R>(render: () => R) => {
      useInsertionEffect(outerEffect.setup, []);
      return original.useTapRoot(render);
    },
  };
});

describe("createTapRoot outer fiber release", () => {
  it.each([false, true])(
    "releases insertion cells once and never recommits with mountOnSubscribe: %s",
    (mountOnSubscribe) => {
      const cleanup = vi.fn();
      const setup = vi.fn(() => cleanup);
      outerEffect.setup = setup;
      const root = createTapRoot(
        function useValue() {
          return 42;
        },
        { mountOnSubscribe },
      );
      const unsubscribe = root.subscribe(() => {});
      expect(setup).toHaveBeenCalledTimes(1);
      expect(cleanup).not.toHaveBeenCalled();

      root.unmount();
      root.unmount();
      expect(cleanup).toHaveBeenCalledTimes(1);
      flushTapSync(unsubscribe);

      const unsubscribeLater = root.subscribe(() => {});
      expect(root.getValue()).toBe(42);
      expect(setup).toHaveBeenCalledTimes(1);
      flushTapSync(unsubscribeLater);
      expect(cleanup).toHaveBeenCalledTimes(1);
    },
  );

  it("retains insertion cells after the last unsubscribe and releases them while disconnected", () => {
    const cleanup = vi.fn();
    const setup = vi.fn(() => cleanup);
    outerEffect.setup = setup;
    const root = createTapRoot(
      function useValue() {
        return 42;
      },
      { mountOnSubscribe: true },
    );
    const unsubscribe = root.subscribe(() => {});

    flushTapSync(unsubscribe);
    expect(cleanup).not.toHaveBeenCalled();
    const unsubscribeAgain = root.subscribe(() => {});
    expect(setup).toHaveBeenCalledTimes(1);
    flushTapSync(unsubscribeAgain);
    expect(cleanup).not.toHaveBeenCalled();

    root.unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
    const unsubscribeLater = root.subscribe(() => {});
    expect(setup).toHaveBeenCalledTimes(1);
    flushTapSync(unsubscribeLater);
    root.unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("does not commit an unmounted root on its first subscription", () => {
    const setup = vi.fn(() => () => {});
    outerEffect.setup = setup;
    const root = createTapRoot(
      function useValue() {
        return 42;
      },
      { mountOnSubscribe: true },
    );

    root.unmount();
    const unsubscribe = root.subscribe(() => {});
    expect(root.getValue()).toBe(42);
    expect(setup).not.toHaveBeenCalled();
    flushTapSync(unsubscribe);
  });

  it("does not commit a queued subscription after permanent release", () => {
    const setup = vi.fn(() => () => {});
    outerEffect.setup = setup;
    const root = createTapRoot(
      function useValue() {
        return 42;
      },
      { mountOnSubscribe: true },
    );

    flushTapSync(() => {
      scheduleTask(() => {
        root.subscribe(() => {});
        root.unmount();
      });
    });
    expect(setup).not.toHaveBeenCalled();
  });
});
