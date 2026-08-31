import { describe, expect, it, vi } from "vitest";
import type { ThreadRuntimeCore } from "../interfaces/thread-runtime-core";
import {
  invalidateThreadRuntime,
  subscribeThreadRuntimeInvalidation,
} from "./thread-runtime-lifecycle";

describe("thread runtime invalidation subscriptions", () => {
  it("does not remove a replacement subscription when an old unsubscribe repeats", () => {
    const runtime = {} as ThreadRuntimeCore;
    const first = vi.fn();
    const second = vi.fn();

    const unsubscribeFirst = subscribeThreadRuntimeInvalidation(runtime, first);
    unsubscribeFirst();
    const unsubscribeSecond = subscribeThreadRuntimeInvalidation(
      runtime,
      second,
    );
    unsubscribeFirst();

    invalidateThreadRuntime(runtime);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledExactlyOnceWith();
    unsubscribeSecond();
  });
});
