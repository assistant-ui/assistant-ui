import { describe, expect, it, vi, beforeEach } from "vitest";
import { BaseSubscribable } from "../legacy-runtime/runtime-cores/remote-thread-list/BaseSubscribable";

class TestSubscribable extends BaseSubscribable {
  public notify() {
    this._notifySubscribers();
  }
}

describe("BaseSubscribable", () => {
  let subscribable: TestSubscribable;

  beforeEach(() => {
    subscribable = new TestSubscribable();
  });

  it("subscribe registers a callback that is called on notify", () => {
    const callback = vi.fn();
    subscribable.subscribe(callback);
    subscribable.notify();
    expect(callback).toHaveBeenCalledOnce();
  });

  it("unsubscribe stops notifications", () => {
    const callback = vi.fn();
    const unsub = subscribable.subscribe(callback);
    unsub();
    subscribable.notify();
    expect(callback).not.toHaveBeenCalled();
  });

  it("multiple subscribers all get notified", () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    subscribable.subscribe(cb1);
    subscribable.subscribe(cb2);
    subscribable.notify();
    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();
  });

  it("subscribe returns an unsubscribe function", () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const unsub1 = subscribable.subscribe(cb1);
    subscribable.subscribe(cb2);

    unsub1();
    subscribable.notify();

    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledOnce();
  });
});
