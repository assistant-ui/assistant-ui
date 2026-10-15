import { afterEach, describe, expect, it, vi } from "vitest";

class FakePort {
  onmessage: (() => void) | null = null;
  other!: FakePort;
  messages: (() => void)[] = [];

  postMessage() {
    this.other.messages.push(() => this.other.onmessage?.());
  }

  deliver() {
    this.messages.shift()?.();
  }
}

class FakeMessageChannel {
  static instance: FakeMessageChannel;
  port1 = new FakePort();
  port2 = new FakePort();

  constructor() {
    this.port1.other = this.port2;
    this.port2.other = this.port1;
    FakeMessageChannel.instance = this;
  }
}

const setup = async () => {
  vi.resetModules();
  vi.stubGlobal("MessageChannel", FakeMessageChannel);
  const tap = await import("../index");
  const { useState } = await import("../react-hooks/useState");
  const { useEffect } = await import("../react-hooks/useEffect");
  return { ...tap, useState, useEffect };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("scheduled error handlers", () => {
  it("delivers an update render error to the root handler", async () => {
    const { createTapRoot, useState } = await setup();
    const error = new Error("render failed");
    const onError = vi.fn();
    let update!: (value: number) => void;
    const root = createTapRoot(
      function Root() {
        const [count, setCount] = useState(0);
        update = setCount;
        if (count === 1) throw error;
        return count;
      },
      { onError },
    );

    update(1);
    expect(() => FakeMessageChannel.instance.port1.deliver()).not.toThrow();
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
    root.unmount();
  });

  it("delivers an update effect error to the root handler", async () => {
    const { createTapRoot, useEffect, useState } = await setup();
    const error = new Error("effect failed");
    const onError = vi.fn();
    let update!: (value: number) => void;
    const root = createTapRoot(
      function Root() {
        const [count, setCount] = useState(0);
        update = setCount;
        useEffect(() => {
          if (count === 1) throw error;
        }, [count]);
        return count;
      },
      { onError },
    );

    update(1);
    expect(() => FakeMessageChannel.instance.port1.deliver()).not.toThrow();
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
    root.unmount();
  });

  it("delivers the maximum update depth error to the root handler", async () => {
    const { createTapRoot, useEffect, useState } = await setup();
    const onError = vi.fn();
    let update!: (value: number) => void;
    const root = createTapRoot(
      function Root() {
        const [count, setCount] = useState(0);
        update = setCount;
        useEffect(() => {
          if (count > 0) setCount(count + 1);
        }, [count]);
        return count;
      },
      { onError },
    );

    update(1);
    expect(() => FakeMessageChannel.instance.port1.deliver()).not.toThrow();
    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0]?.[0] as Error).message).toMatch(
      /Maximum update depth exceeded/,
    );
    root.unmount();
  });

  it("sends unclaimed root errors to the global handler", async () => {
    const { createTapRoot, setTapErrorHandler, useState } = await setup();
    const error = new Error("unclaimed");
    const onError = vi.fn();
    setTapErrorHandler(onError);
    let update!: (value: number) => void;
    const root = createTapRoot(function Root() {
      const [count, setCount] = useState(0);
      update = setCount;
      if (count === 1) throw error;
      return count;
    });

    update(1);
    expect(() => FakeMessageChannel.instance.port1.deliver()).not.toThrow();
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
    setTapErrorHandler(undefined);
    root.unmount();
  });

  it("delivers two unclaimed createTapRoot task errors individually and unwrapped", async () => {
    const { createTapRoot, setTapErrorHandler, useState } = await setup();
    const errors = [
      new Error("first task failed"),
      new Error("second task failed"),
    ];
    const onError = vi.fn();
    setTapErrorHandler(onError);
    const updates: ((value: number) => void)[] = [];
    const roots = errors.map((error) =>
      createTapRoot(function Root() {
        const [count, setCount] = useState(0);
        updates.push(setCount);
        if (count === 1) throw error;
        return count;
      }),
    );

    for (const update of updates) update(1);
    expect(() => FakeMessageChannel.instance.port1.deliver()).not.toThrow();
    expect(onError).toHaveBeenCalledTimes(2);
    expect(onError.mock.calls[0]?.[0]).toBe(errors[0]);
    expect(onError.mock.calls[1]?.[0]).toBe(errors[1]);
    for (const root of roots) root.unmount();
  });

  it.each([1, 2])(
    "delivers all errors before rethrowing %i global handler failures",
    async (failureCount) => {
      const { setTapErrorHandler } = await setup();
      const { scheduleNotify, UpdateScheduler } =
        await import("../core/scheduler");
      const errors = [
        new Error("scheduler failed"),
        new Error("notify failed"),
      ];
      const handlerErrors = Array.from(
        { length: failureCount },
        (_, index) => new Error(`handler failed ${index}`),
      );
      const onError = vi.fn();
      for (const error of handlerErrors) {
        onError.mockImplementationOnce(() => {
          throw error;
        });
      }
      setTapErrorHandler(onError);
      const scheduler = new UpdateScheduler(() => {
        scheduleNotify(() => {
          throw errors[1];
        });
        throw errors[0];
      });

      scheduler.markDirty();
      let caught: unknown;
      try {
        FakeMessageChannel.instance.port1.deliver();
      } catch (error) {
        caught = error;
      }

      expect(onError).toHaveBeenCalledTimes(2);
      expect(onError.mock.calls[0]?.[0]).toBe(errors[0]);
      expect(onError.mock.calls[1]?.[0]).toBe(errors[1]);
      if (failureCount === 1) {
        expect(caught).toBe(handlerErrors[0]);
      } else {
        expect(caught).toBeInstanceOf(AggregateError);
        expect((caught as AggregateError).errors).toEqual(handlerErrors);
      }
    },
  );

  it("preserves task aggregation and logging without a global handler", async () => {
    const { createTapRoot, useState } = await setup();
    const errors = [
      new Error("first task failed"),
      new Error("second task failed"),
    ];
    const updates: ((value: number) => void)[] = [];
    const roots = errors.map((error) =>
      createTapRoot(function Root() {
        const [count, setCount] = useState(0);
        updates.push(setCount);
        if (count === 1) throw error;
        return count;
      }),
    );
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      for (const update of updates) update(1);
      let caught: unknown;
      try {
        FakeMessageChannel.instance.port1.deliver();
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(AggregateError);
      expect((caught as AggregateError).message).toBe(
        "Errors occurred while running scheduled tasks",
      );
      expect((caught as AggregateError).errors).toEqual(errors);
      expect(logError.mock.calls).toEqual(errors.map((error) => [error]));
    } finally {
      logError.mockRestore();
      for (const root of roots) root.unmount();
    }
  });

  it("prefers the root handler over the global handler", async () => {
    const { createTapRoot, setTapErrorHandler, useState } = await setup();
    const error = new Error("owned");
    const onRootError = vi.fn();
    const onGlobalError = vi.fn();
    setTapErrorHandler(onGlobalError);
    let update!: (value: number) => void;
    const root = createTapRoot(
      function Root() {
        const [count, setCount] = useState(0);
        update = setCount;
        if (count === 1) throw error;
        return count;
      },
      { onError: onRootError },
    );

    update(1);
    expect(() => FakeMessageChannel.instance.port1.deliver()).not.toThrow();
    expect(onRootError).toHaveBeenCalledExactlyOnceWith(error);
    expect(onGlobalError).not.toHaveBeenCalled();
    root.unmount();
  });

  it("routes a scheduled subscriber error to its root handler", async () => {
    const { createTapRoot, useState } = await setup();
    const error = new Error("listener failed");
    const onError = vi.fn();
    let update!: (value: number) => void;
    const root = createTapRoot(
      function Root() {
        const [count, setCount] = useState(0);
        update = setCount;
        return count;
      },
      { onError },
    );
    const unsubscribe = root.subscribe(() => {
      throw error;
    });

    update(1);
    expect(() => FakeMessageChannel.instance.port1.deliver()).not.toThrow();
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
    unsubscribe();
    root.unmount();
  });

  it("keeps synchronous flush errors on the caller path", async () => {
    const { createTapRoot, flushTapSync, setTapErrorHandler, useState } =
      await setup();
    const error = new Error("synchronous");
    const onRootError = vi.fn();
    const onGlobalError = vi.fn();
    setTapErrorHandler(onGlobalError);
    let update!: (value: number) => void;
    const root = createTapRoot(
      function Root() {
        const [count, setCount] = useState(0);
        update = setCount;
        if (count === 1) throw error;
        return count;
      },
      { onError: onRootError },
    );

    expect(() => flushTapSync(() => update(1))).toThrow(error);
    expect(onRootError).not.toHaveBeenCalled();
    expect(onGlobalError).not.toHaveBeenCalled();
    root.unmount();
  });

  it("still rethrows an unhandled error from the macrotask", async () => {
    const { createTapRoot, useState } = await setup();
    const error = new Error("unhandled");
    let update!: (value: number) => void;
    const root = createTapRoot(function Root() {
      const [count, setCount] = useState(0);
      update = setCount;
      if (count === 1) throw error;
      return count;
    });

    update(1);
    expect(() => FakeMessageChannel.instance.port1.deliver()).toThrow(error);
    root.unmount();
  });

  it("runs a sibling root task after handling an error", async () => {
    const { createTapRoot, useState } = await setup();
    const error = new Error("first root failed");
    const onError = vi.fn();
    let updateFirst!: (value: number) => void;
    let updateSecond!: (value: number) => void;
    const first = createTapRoot(
      function First() {
        const [count, setCount] = useState(0);
        updateFirst = setCount;
        if (count === 1) throw error;
        return count;
      },
      { onError },
    );
    const second = createTapRoot(function Second() {
      const [count, setCount] = useState(0);
      updateSecond = setCount;
      return count;
    });

    updateFirst(1);
    updateSecond(1);
    expect(() => FakeMessageChannel.instance.port1.deliver()).not.toThrow();
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
    expect(second.getValue()).toBe(1);
    first.unmount();
    second.unmount();
  });
});
