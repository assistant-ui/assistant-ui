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

/**
 * Tests for the onThreadIdChange notification logic in
 * RemoteThreadListThreadListRuntimeCore._notifyThreadIdChange.
 *
 * The core emits the active thread's settled remote ID, deduping against the
 * last value so the same ID is never emitted twice, and never surfacing the
 * transient optimistic local ID (remote ID is undefined until initialized).
 * We mirror the dedup logic here.
 */
function makeNotifier(onThreadIdChange: (id: string | undefined) => void) {
  let last: string | undefined = undefined;
  return (remoteId: string | undefined) => {
    if (last === remoteId) return;
    last = remoteId;
    onThreadIdChange(remoteId);
  };
}

describe("onThreadIdChange notification", () => {
  it("does not emit when a new thread stays optimistic (no remote ID)", () => {
    const cb = vi.fn();
    const notify = makeNotifier(cb);

    // initial new thread: remote ID undefined, matches initial last → no emit
    notify(undefined);

    expect(cb).not.toHaveBeenCalled();
  });

  it("emits the remote ID once the thread is initialized", () => {
    const cb = vi.fn();
    const notify = makeNotifier(cb);

    notify(undefined); // optimistic new thread
    notify("remote-1"); // initialize resolves

    expect(cb).toHaveBeenCalledExactlyOnceWith("remote-1");
  });

  it("dedupes repeated notifications for the same remote ID", () => {
    const cb = vi.fn();
    const notify = makeNotifier(cb);

    notify("remote-1");
    notify("remote-1");
    notify("remote-1");

    expect(cb).toHaveBeenCalledExactlyOnceWith("remote-1");
  });

  it("emits undefined when switching from a thread to a new thread", () => {
    const cb = vi.fn();
    const notify = makeNotifier(cb);

    notify("remote-1"); // on an existing thread
    notify(undefined); // switched to a fresh new thread

    expect(cb).toHaveBeenLastCalledWith(undefined);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it("emits each distinct remote ID across navigation", () => {
    const cb = vi.fn();
    const notify = makeNotifier(cb);

    notify("remote-1");
    notify("remote-2");
    notify("remote-1");

    expect(cb.mock.calls).toEqual([["remote-1"], ["remote-2"], ["remote-1"]]);
  });
});
