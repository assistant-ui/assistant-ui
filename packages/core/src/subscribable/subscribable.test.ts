import { describe, expect, it, vi } from "vitest";
import type { SubscribableWithState } from "./subscribable";
import { LazyMemoizeSubject, ShallowMemoizeSubject } from "./subscribable";

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

describe("ShallowMemoizeSubject", () => {
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
