import { describe, it, expect, vi } from "vitest";
import { createTapRoot } from "../../core/createTapRoot";
import { useEffect } from "../../react-hooks/useEffect";
import { useState } from "../../react-hooks/useState";
import { isDevelopment } from "../../core/helpers/env";

const mountRuns = isDevelopment ? 2 : 1;

describe("createTapRoot deferred mount", () => {
  it("mounts immediately by default", () => {
    const effect = vi.fn();
    const root = createTapRoot(() => {
      useEffect(effect);
      return 1;
    });

    expect(effect).toHaveBeenCalledTimes(mountRuns);
    root.unmount();
  });

  it("renders without running effects when mount is false", () => {
    const effect = vi.fn();
    const root = createTapRoot(
      () => {
        useEffect(effect);
        const [count] = useState(42);
        return count;
      },
      { mount: false },
    );

    expect(root.getValue()).toBe(42);
    expect(effect).not.toHaveBeenCalled();
    root.unmount();
    expect(effect).not.toHaveBeenCalled();
  });

  it("runs effects when mount() is called", () => {
    const effect = vi.fn();
    const cleanup = vi.fn();
    const root = createTapRoot(
      () => {
        useEffect(() => {
          effect();
          return cleanup;
        });
        return null;
      },
      { mount: false },
    );

    root.mount();
    expect(effect).toHaveBeenCalledTimes(mountRuns);

    root.unmount();
    expect(cleanup).toHaveBeenCalledTimes(mountRuns);
  });

  it("mount() is idempotent", () => {
    const effect = vi.fn();
    const root = createTapRoot(
      () => {
        useEffect(effect);
        return null;
      },
      { mount: false },
    );

    root.mount();
    root.mount();
    expect(effect).toHaveBeenCalledTimes(mountRuns);
    root.unmount();
  });

  it("throws when mounting after unmount", () => {
    const root = createTapRoot(() => null, { mount: false });
    root.unmount();
    expect(() => root.mount()).toThrow(
      "Cannot mount a tap root that has been unmounted",
    );
  });

  it("throws on state updates before mount", () => {
    let setCount: (value: number) => void;
    const root = createTapRoot(
      () => {
        const [count, setState] = useState(0);
        setCount = setState;
        return count;
      },
      { mount: false },
    );

    expect(() => setCount!(1)).toThrow("Resource updated before mount");
    root.unmount();
  });

  it("processes state updates after a deferred mount", async () => {
    let setCount: (value: number) => void;
    const root = createTapRoot(
      () => {
        const [count, setState] = useState(0);
        setCount = setState;
        return count;
      },
      { mount: false },
    );

    root.mount();

    const listener = vi.fn();
    root.subscribe(listener);

    setCount!(5);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(root.getValue()).toBe(5);
    expect(listener).toHaveBeenCalledTimes(1);
    root.unmount();
  });
});
