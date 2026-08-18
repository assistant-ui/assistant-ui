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
});
