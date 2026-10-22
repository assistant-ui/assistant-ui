import { describe, expect, it, vi } from "vitest";
import { createAbortableThreadLoad } from "./abortable-thread-load";

const callbacks = () => ({
  onSettled: vi.fn(),
  onInitialError: vi.fn(),
});

describe("createAbortableThreadLoad", () => {
  it("defers a reload to an in-flight initial load", async () => {
    let resolveInitial!: () => void;
    const initialLoad = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveInitial = resolve;
        }),
    );
    const reloadLoad = vi.fn(() => Promise.resolve());
    const controller = createAbortableThreadLoad();

    const initial = controller.run({
      purpose: "initial",
      load: initialLoad,
      ...callbacks(),
    });
    const reload = controller.run({
      purpose: "reload",
      load: reloadLoad,
      ...callbacks(),
    });

    expect(reloadLoad).not.toHaveBeenCalled();
    resolveInitial();
    await Promise.all([initial, reload]);
  });

  it("keeps the replacement abortable after a superseded load fails", async () => {
    let rejectFirst!: (error: Error) => void;
    let firstSignal!: AbortSignal;
    let secondSignal!: AbortSignal;
    let resolveSecond!: () => void;
    const controller = createAbortableThreadLoad();
    const first = controller.run({
      purpose: "reload",
      load: (signal) => {
        firstSignal = signal;
        return new Promise<void>((_, reject) => {
          rejectFirst = reject;
        });
      },
      ...callbacks(),
    });

    const second = controller.run({
      purpose: "initial",
      load: (signal) => {
        secondSignal = signal;
        return new Promise<void>((resolve) => {
          resolveSecond = resolve;
        });
      },
      ...callbacks(),
    });
    rejectFirst(new Error("aborted"));

    expect(firstSignal.aborted).toBe(true);
    await expect(first).resolves.toBeUndefined();
    expect(secondSignal.aborted).toBe(false);
    controller.abort();
    expect(secondSignal.aborted).toBe(true);
    resolveSecond();
    await second;
  });

  it("swallows initial failures and surfaces reload failures", async () => {
    const controller = createAbortableThreadLoad();
    const initialCallbacks = callbacks();
    const initialError = new Error("initial");

    await expect(
      controller.run({
        purpose: "initial",
        load: () => Promise.reject(initialError),
        ...initialCallbacks,
      }),
    ).resolves.toBeUndefined();
    expect(initialCallbacks.onInitialError).toHaveBeenCalledWith(initialError);

    const reloadError = new Error("reload");
    await expect(
      controller.run({
        purpose: "reload",
        load: () => Promise.reject(reloadError),
        ...callbacks(),
      }),
    ).rejects.toBe(reloadError);
  });
});
