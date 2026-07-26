import { describe, expect, it, vi } from "vitest";
import type { SubscribableWithState } from "./subscribable";
import { ShallowMemoizeSubject } from "./subscribable";

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
});
