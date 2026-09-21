import { describe, expect, it, onTestFinished, vi } from "vitest";
import type { SubscribableWithState } from "./subscribable";
import {
  EventSubscriptionSubject,
  LazyMemoizeSubject,
  NestedSubscriptionSubject,
  runCleanups,
  ShallowMemoizeSubject,
} from "./subscribable";

type TestState = {
  status: string;
  error?: string;
};

const createBinding = (initialState: TestState) => {
  let state = initialState;
  const subscribers = new Set<() => void>();

  const binding: SubscribableWithState<TestState, null> = {
    path: null,
    getState: () => state,
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
  };

  return {
    binding,
    update(nextState: TestState) {
      state = nextState;
      for (const callback of subscribers) callback();
    },
    replace(nextState: TestState) {
      state = nextState;
    },
  };
};

// Mirrors runtime bindings such as `getThreadListState`, which assemble a new
// object on every read while the underlying values keep their identity.
const createRebuildingBinding = (initialState: TestState) => {
  let state = initialState;
  const subscribers = new Set<() => void>();

  const binding: SubscribableWithState<TestState, null> = {
    path: null,
    getState: () => ({ ...state }),
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
  };

  return {
    binding,
    update(nextState: TestState) {
      state = nextState;
      for (const callback of subscribers) callback();
    },
  };
};

describe("runCleanups", () => {
  it("runs every cleanup before rethrowing an error", () => {
    const cleanupError = new Error("cleanup failed");
    const laterCleanup = vi.fn();

    expect(() =>
      runCleanups([
        () => {
          throw cleanupError;
        },
        laterCleanup,
      ]),
    ).toThrow(cleanupError);
    expect(laterCleanup).toHaveBeenCalledOnce();
  });

  it("preserves every error when multiple cleanups throw", () => {
    const firstError = new Error("first cleanup failed");
    const secondError = new Error("second cleanup failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      let thrown: unknown;
      try {
        runCleanups([
          () => {
            throw firstError;
          },
          () => {
            throw secondError;
          },
        ]);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(AggregateError);
      expect((thrown as AggregateError).errors).toEqual([
        firstError,
        secondError,
      ]);
      expect(consoleError).toHaveBeenNthCalledWith(1, firstError);
      expect(consoleError).toHaveBeenNthCalledWith(2, secondError);
    } finally {
      consoleError.mockRestore();
    }
  });
});

describe("ShallowMemoizeSubject", () => {
  it("removes a subscriber when the initial connection throws", () => {
    const connectionError = new Error("connection failed");
    let state = { status: "empty" };
    let sourceUpdate: (() => void) | undefined;
    let shouldThrow = true;
    const subject = new ShallowMemoizeSubject({
      path: null,
      getState: () => state,
      subscribe: (callback) => {
        if (shouldThrow) {
          shouldThrow = false;
          throw connectionError;
        }
        sourceUpdate = callback;
        return () => {};
      },
    });
    const failedSubscriber = vi.fn();

    expect(() => subject.subscribe(failedSubscriber)).toThrow(connectionError);

    const activeSubscriber = vi.fn();
    subject.subscribe(activeSubscriber);
    state = { status: "ready" };
    sourceUpdate?.();

    expect(failedSubscriber).not.toHaveBeenCalled();
    expect(activeSubscriber).toHaveBeenCalledOnce();
  });

  it("cleans up the source when synchronization after subscribe throws", () => {
    const synchronizationError = new Error("synchronization failed");
    const sourceCleanup = vi.fn();
    let readCount = 0;
    const subject = new ShallowMemoizeSubject({
      path: null,
      getState: () => {
        readCount += 1;
        if (readCount === 2) throw synchronizationError;
        return { status: "ready" };
      },
      subscribe: () => sourceCleanup,
    });

    expect(() => subject.subscribe(() => {})).toThrow(synchronizationError);

    expect(sourceCleanup).toHaveBeenCalledOnce();
  });

  it("preserves a connection error when rollback cleanup also throws", () => {
    const connectionError = new Error("synchronization failed");
    const cleanupError = new Error("cleanup failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    onTestFinished(() => consoleError.mockRestore());
    let readCount = 0;
    const subject = new ShallowMemoizeSubject({
      path: null,
      getState: () => {
        readCount += 1;
        if (readCount === 2) throw connectionError;
        return { status: "ready" };
      },
      subscribe: () => () => {
        throw cleanupError;
      },
    });

    expect(() => subject.subscribe(() => {})).toThrow(connectionError);
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Subscription rollback cleanup threw",
      cleanupError,
    );
  });

  it("notifies subscribers when a state key is removed", () => {
    const source = createBinding({
      status: "running",
      error: "Connection failed",
    });
    const subject = new ShallowMemoizeSubject(source.binding);
    const subscriber = vi.fn();
    subject.subscribe(subscriber);

    source.update({ status: "running" });

    expect(subscriber).toHaveBeenCalledOnce();
    expect(subject.getState()).toEqual({ status: "running" });
  });

  it("does not notify subscribers for a shallow-equal state", () => {
    const source = createBinding({ status: "running" });
    const subject = new ShallowMemoizeSubject(source.binding);
    const subscriber = vi.fn();
    subject.subscribe(subscriber);

    source.update({ status: "running" });

    expect(subscriber).not.toHaveBeenCalled();
  });

  it("notifies later subscribers when one throws", () => {
    const source = createBinding({ status: "empty" });
    const subject = new ShallowMemoizeSubject(source.binding);
    const error = new Error("subscriber failed");
    const laterSubscriber = vi.fn();
    subject.subscribe(() => {
      throw error;
    });
    subject.subscribe(laterSubscriber);

    expect(() => source.update({ status: "ready" })).toThrow(error);
    expect(laterSubscriber).toHaveBeenCalledOnce();
    expect(subject.getState()).toEqual({ status: "ready" });
  });

  it("reads a value that landed while nobody was subscribed", () => {
    const source = createBinding({ status: "empty" });
    const subject = new ShallowMemoizeSubject(source.binding);
    expect(subject.getState()).toEqual({ status: "empty" });

    source.update({ status: "ready" });
    const subscriber = vi.fn();
    subject.subscribe(subscriber);

    expect(subject.getState()).toEqual({ status: "ready" });
    expect(subscriber).not.toHaveBeenCalled();
  });

  it("reconnects after the previous connection cleanup throws", () => {
    let subscribeCount = 0;
    const cleanupError = new Error("cleanup failed");
    const binding: SubscribableWithState<TestState, null> = {
      path: null,
      getState: () => ({ status: "ready" }),
      subscribe: () => {
        subscribeCount += 1;
        return () => {
          throw cleanupError;
        };
      },
    };
    const subject = new ShallowMemoizeSubject(binding);

    const unsubscribe = subject.subscribe(() => {});
    expect(() => unsubscribe()).toThrow(cleanupError);

    subject.subscribe(() => {});
    expect(subscribeCount).toBe(2);
  });
});

describe("LazyMemoizeSubject", () => {
  it("notifies later subscribers when one throws", () => {
    const source = createBinding({ status: "empty" });
    const subject = new LazyMemoizeSubject(source.binding);
    const error = new Error("subscriber failed");
    const laterSubscriber = vi.fn();
    subject.subscribe(() => {
      throw error;
    });
    subject.subscribe(laterSubscriber);

    expect(() => source.update({ status: "ready" })).toThrow(error);
    expect(laterSubscriber).toHaveBeenCalledOnce();
    expect(subject.getState()).toEqual({ status: "ready" });
  });

  it("reads a value replaced before connecting", () => {
    const source = createBinding({ status: "empty" });
    const subject = new LazyMemoizeSubject(source.binding);
    expect(subject.getState()).toEqual({ status: "empty" });

    source.replace({ status: "ready" });
    const subscriber = vi.fn();
    const unsubscribe = subject.subscribe(subscriber);

    expect(subject.getState()).toEqual({ status: "ready" });
    expect(subscriber).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("resynchronizes after reconnecting", () => {
    const source = createBinding({ status: "empty" });
    const subject = new LazyMemoizeSubject(source.binding);
    expect(subject.getState()).toEqual({ status: "empty" });

    const unsubscribe = subject.subscribe(() => {});
    unsubscribe();
    source.replace({ status: "ready" });
    const reconnect = subject.subscribe(() => {});

    expect(subject.getState()).toEqual({ status: "ready" });
    reconnect();
  });

  it("keeps one reference while unconnected and the state is unchanged", () => {
    // A consumer that reads without subscribing (React's useSyncExternalStore
    // calls getSnapshot outside the subscription) must not see a new object on
    // every call: React compares snapshots with Object.is, so a fresh reference
    // reads as a change and re-renders forever.
    const source = createRebuildingBinding({ status: "ready" });
    const subject = new LazyMemoizeSubject(source.binding);

    const first = subject.getState();

    expect(subject.getState()).toBe(first);
    expect(subject.getState()).toBe(first);
  });

  it("returns a new reference once the unchanged state actually changes", () => {
    const source = createRebuildingBinding({ status: "ready" });
    const subject = new LazyMemoizeSubject(source.binding);

    const first = subject.getState();
    source.update({ status: "done" });

    const second = subject.getState();
    expect(second).not.toBe(first);
    expect(second).toEqual({ status: "done" });
  });
});

describe("nested subscription swaps", () => {
  it("cleans up the initial nested source when the outer subscribe throws", () => {
    const connectionError = new Error("outer connection failed");
    const innerCleanup = vi.fn();
    const subject = new NestedSubscriptionSubject({
      path: null,
      getState: () => ({ subscribe: () => innerCleanup }),
      subscribe: () => {
        throw connectionError;
      },
    });

    expect(() => subject.subscribe(() => {})).toThrow(connectionError);

    expect(innerCleanup).toHaveBeenCalledOnce();
  });

  it("cleans up the initial event source when the outer subscribe throws", () => {
    const connectionError = new Error("outer connection failed");
    const innerCleanup = vi.fn();
    const subject = new EventSubscriptionSubject({
      event: "test",
      binding: {
        path: null,
        getState: () => ({ unstable_on: () => innerCleanup }),
        subscribe: () => {
          throw connectionError;
        },
      },
    });

    expect(() => subject.subscribe(() => {})).toThrow(connectionError);

    expect(innerCleanup).toHaveBeenCalledOnce();
  });

  it("preserves a nested connection error when rollback cleanup also throws", () => {
    const connectionError = new Error("outer connection failed");
    const cleanupError = new Error("inner cleanup failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    onTestFinished(() => consoleError.mockRestore());
    const subject = new NestedSubscriptionSubject({
      path: null,
      getState: () => ({
        subscribe: () => () => {
          throw cleanupError;
        },
      }),
      subscribe: () => {
        throw connectionError;
      },
    });

    expect(() => subject.subscribe(() => {})).toThrow(connectionError);
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Subscription rollback cleanup threw",
      cleanupError,
    );
  });

  it("preserves an event connection error when rollback cleanup also throws", () => {
    const connectionError = new Error("outer connection failed");
    const cleanupError = new Error("event cleanup failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    onTestFinished(() => consoleError.mockRestore());
    const subject = new EventSubscriptionSubject({
      event: "test",
      binding: {
        path: null,
        getState: () => ({
          unstable_on: () => () => {
            throw cleanupError;
          },
        }),
        subscribe: () => {
          throw connectionError;
        },
      },
    });

    expect(() => subject.subscribe(() => {})).toThrow(connectionError);
    expect(consoleError).toHaveBeenCalledWith(
      "[assistant-ui] Subscription rollback cleanup threw",
      cleanupError,
    );
  });

  it("connects the next nested source when the previous cleanup throws", () => {
    const cleanupError = new Error("cleanup failed");
    let outerUpdate!: () => void;
    let nextUpdate!: () => void;
    const previous = {
      subscribe: () => () => {
        throw cleanupError;
      },
    };
    const nextSubscribe = vi.fn((callback: () => void) => {
      nextUpdate = callback;
      return () => {};
    });
    const next = { subscribe: nextSubscribe };
    let current: { subscribe: (callback: () => void) => () => void } = previous;
    const subject = new NestedSubscriptionSubject({
      path: null,
      getState: () => current,
      subscribe: (callback) => {
        outerUpdate = callback;
        return () => {};
      },
    });
    const listener = vi.fn();
    subject.subscribe(listener);

    current = next;
    expect(() => outerUpdate()).toThrow(cleanupError);
    expect(nextSubscribe).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledOnce();

    nextUpdate();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("connects the next event source when the previous cleanup throws", () => {
    const cleanupError = new Error("cleanup failed");
    let outerUpdate!: () => void;
    let nextEvent!: (payload?: unknown) => void;
    const previous = {
      unstable_on: () => () => {
        throw cleanupError;
      },
    };
    const nextSubscribe = vi.fn(
      (_event: string, callback: (payload?: unknown) => void) => {
        nextEvent = callback;
        return () => {};
      },
    );
    const next = { unstable_on: nextSubscribe };
    let current: {
      unstable_on: (
        event: string,
        callback: (payload?: unknown) => void,
      ) => () => void;
    } = previous;
    const subject = new EventSubscriptionSubject({
      event: "test",
      binding: {
        path: null,
        getState: () => current,
        subscribe: (callback) => {
          outerUpdate = callback;
          return () => {};
        },
      },
    });
    const listener = vi.fn();
    subject.subscribe(listener);

    current = next;
    expect(() => outerUpdate()).toThrow(cleanupError);
    expect(nextSubscribe).toHaveBeenCalledOnce();

    nextEvent("payload");
    expect(listener).toHaveBeenCalledWith("payload");
  });
});
