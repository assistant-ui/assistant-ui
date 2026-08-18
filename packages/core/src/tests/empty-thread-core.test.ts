import { describe, it, expect, vi } from "vitest";
import { EMPTY_THREAD_CORE } from "../runtimes/remote-thread-list/empty-thread-core";

describe("EMPTY_THREAD_CORE", () => {
  it("stays a stable singleton", () => {
    expect(EMPTY_THREAD_CORE).toBe(EMPTY_THREAD_CORE);
  });

  it("subscribe is inert and never retains a callback on the singleton", () => {
    const subscribers = (EMPTY_THREAD_CORE as unknown as Record<string, any>)
      ._subscribers;
    expect(subscribers).toBeInstanceOf(Set);
    const before = subscribers.size;

    const callback = vi.fn();
    const unsubscribe = EMPTY_THREAD_CORE.subscribe(callback);
    EMPTY_THREAD_CORE.subscribe(vi.fn());

    expect(unsubscribe).toBeInstanceOf(Function);
    expect(() => unsubscribe()).not.toThrow();
    expect(callback).not.toHaveBeenCalled();
    expect(subscribers.size).toBe(before);
  });

  it("reads no messages, branches, or exported repository", () => {
    expect(EMPTY_THREAD_CORE.getMessageById("a")).toBeUndefined();
    expect(EMPTY_THREAD_CORE.getBranches("a")).toEqual([]);
    expect(EMPTY_THREAD_CORE.export()).toEqual({ messages: [] });
  });

  it("has isLoading=true so it is not mistaken for an empty conversation", () => {
    expect(EMPTY_THREAD_CORE.isLoading).toBe(true);
  });

  it("has empty messages", () => {
    expect(EMPTY_THREAD_CORE.messages).toEqual([]);
  });

  it("does not trigger isEmpty (messages.length === 0 && !isLoading)", () => {
    const isEmpty =
      EMPTY_THREAD_CORE.messages.length === 0 && !EMPTY_THREAD_CORE.isLoading;
    expect(isEmpty).toBe(false);
  });

  it("all capabilities are disabled", () => {
    const caps = EMPTY_THREAD_CORE.capabilities;
    expect(caps.edit).toBe(false);
    expect(caps.reload).toBe(false);
    expect(caps.cancel).toBe(false);
    expect(caps.speech).toBe(false);
    expect(caps.attachments).toBe(false);
  });

  it("mutating methods throw", () => {
    expect(() => EMPTY_THREAD_CORE.append({} as any)).toThrow();
    expect(() => EMPTY_THREAD_CORE.startRun({} as any)).toThrow();
    expect(() => EMPTY_THREAD_CORE.cancelRun()).toThrow();
  });
});
