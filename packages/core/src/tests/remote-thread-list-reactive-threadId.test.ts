import { describe, it, expect, vi } from "vitest";

/**
 * Tests for the reactive threadId useEffect logic in useRemoteThreadListRuntime.
 *
 * The useEffect compares options.threadId against a prevThreadIdRef and calls
 * switchToThread or switchToNewThread when it changes. We test this logic
 * by simulating the ref + comparison pattern.
 */

// Mirrors the useEffect in useRemoteThreadListRuntimeImpl.
// Keep in sync if that implementation changes.
function simulateThreadIdEffect(
  prevRef: { current: string | undefined },
  threadId: string | undefined,
  switchToThread: (id: string) => void,
  switchToNewThread: () => void,
) {
  if (threadId === prevRef.current) return;
  prevRef.current = threadId;
  if (threadId) {
    switchToThread(threadId);
  } else {
    switchToNewThread();
  }
}

describe("threadId reactive effect", () => {
  it("does nothing when threadId stays the same", () => {
    const ref = { current: "thread-1" };
    const switchToThread = vi.fn();
    const switchToNewThread = vi.fn();

    simulateThreadIdEffect(ref, "thread-1", switchToThread, switchToNewThread);

    expect(switchToThread).not.toHaveBeenCalled();
    expect(switchToNewThread).not.toHaveBeenCalled();
  });

  it("calls switchToThread when threadId changes", () => {
    const ref = { current: "thread-1" };
    const switchToThread = vi.fn();
    const switchToNewThread = vi.fn();

    simulateThreadIdEffect(ref, "thread-2", switchToThread, switchToNewThread);

    expect(switchToThread).toHaveBeenCalledWith("thread-2");
    expect(ref.current).toBe("thread-2");
  });

  it("calls switchToNewThread when threadId becomes undefined", () => {
    const ref = { current: "thread-1" };
    const switchToThread = vi.fn();
    const switchToNewThread = vi.fn();

    simulateThreadIdEffect(ref, undefined, switchToThread, switchToNewThread);

    expect(switchToNewThread).toHaveBeenCalledOnce();
    expect(ref.current).toBeUndefined();
  });

  it("skips switchToNewThread on first render when threadId is already undefined", () => {
    const ref = { current: undefined as string | undefined };
    const switchToThread = vi.fn();
    const switchToNewThread = vi.fn();

    // First render: undefined === undefined → skipped
    simulateThreadIdEffect(ref, undefined, switchToThread, switchToNewThread);
    expect(switchToNewThread).not.toHaveBeenCalled();
  });

  it("handles full navigation cycle", () => {
    const ref = { current: undefined as string | undefined };
    const switchToThread = vi.fn();
    const switchToNewThread = vi.fn();

    // Mount with thread-1
    simulateThreadIdEffect(ref, "thread-1", switchToThread, switchToNewThread);
    expect(switchToThread).toHaveBeenCalledWith("thread-1");

    // Navigate to thread-2
    simulateThreadIdEffect(ref, "thread-2", switchToThread, switchToNewThread);
    expect(switchToThread).toHaveBeenCalledWith("thread-2");

    // Navigate to new thread
    simulateThreadIdEffect(ref, undefined, switchToThread, switchToNewThread);
    expect(switchToNewThread).toHaveBeenCalledOnce();

    // Navigate back to thread-1
    simulateThreadIdEffect(ref, "thread-1", switchToThread, switchToNewThread);
    expect(switchToThread).toHaveBeenCalledTimes(3);
  });
});
