import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ThreadComposerRuntimeImpl,
  type ThreadComposerRuntimeCoreBinding,
} from "../runtime/api/composer-runtime";
import {
  ThreadRuntimeImpl,
  type ThreadListItemRuntimeBinding,
  type ThreadRuntimeCoreBinding,
} from "../runtime/api/thread-runtime";
import { ReadonlyThreadRuntimeCore } from "../runtimes/readonly/ReadonlyThreadRuntimeCore";
import type { Unsubscribe } from "../types/unsubscribe";

type EventListener = (payload?: unknown) => unknown;

class GuardedEventSource {
  private listeners = new Set<EventListener>();

  public unstable_on = (
    _event: string,
    listener: EventListener,
  ): Unsubscribe => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public emit(payload?: unknown) {
    for (const listener of this.listeners) {
      try {
        const result = listener(payload);
        if (
          typeof result === "object" &&
          result !== null &&
          "then" in result &&
          typeof result.then === "function"
        ) {
          void Promise.resolve(result).catch((error) => {
            console.error("[test source] listener error", error);
          });
        }
      } catch (error) {
        console.error("[test source] listener error", error);
      }
    }
  }
}

type RuntimeHarness = {
  subscribe: (listener: EventListener) => Unsubscribe;
  emit: () => void;
  errorContext: string;
};

const makeComposerHarness = (): RuntimeHarness => {
  const source = new GuardedEventSource();
  const binding = {
    path: {
      ref: "test.composer",
      threadSelector: { type: "main" },
      composerSource: "thread",
    },
    getState: () => ({ unstable_on: source.unstable_on }),
    subscribe: () => () => {},
  } as unknown as ThreadComposerRuntimeCoreBinding;
  const runtime = new ThreadComposerRuntimeImpl(binding);

  return {
    subscribe: (listener) =>
      runtime.unstable_on("attachmentAdd", listener as never),
    emit: () => source.emit({}),
    errorContext: 'Runtime event "attachmentAdd"',
  };
};

const makeThreadHarness = (): RuntimeHarness => {
  const source = new GuardedEventSource();
  const core = new ReadonlyThreadRuntimeCore();
  core.unstable_on = source.unstable_on as typeof core.unstable_on;

  const path = {
    ref: "test.thread",
    threadSelector: { type: "main" as const },
  };
  const threadBinding: ThreadRuntimeCoreBinding = {
    path,
    getState: () => core,
    subscribe: (listener) => core.subscribe(listener),
    outerSubscribe: (listener) => core.subscribe(listener),
  };
  const threadListItemBinding: ThreadListItemRuntimeBinding = {
    path,
    getState: () => ({
      id: "test",
      remoteId: undefined,
      externalId: undefined,
      isMain: true,
      status: "regular",
      title: undefined,
    }),
    subscribe: () => () => {},
  };
  const runtime = new ThreadRuntimeImpl(threadBinding, threadListItemBinding);

  return {
    subscribe: (listener) => runtime.unstable_on("initialize", listener),
    emit: () => source.emit({}),
    errorContext: 'Runtime event "initialize"',
  };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe.each([
  ["composer", makeComposerHarness],
  ["thread", makeThreadHarness],
] as const)("%s public unstable_on", (_name, makeHarness) => {
  it("continues notifying sibling listeners after a synchronous error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const harness = makeHarness();
    const sibling = vi.fn();

    harness.subscribe(() => {
      throw new Error("listener failed");
    });
    harness.subscribe(sibling);

    harness.emit();

    expect(sibling).toHaveBeenCalledOnce();
  });

  it("handles rejected thenables returned by listeners", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const harness = makeHarness();
    const listenerError = new Error("async listener failed");
    const then = vi.fn(
      (
        _resolve: (value?: unknown) => void,
        reject: (reason?: unknown) => void,
      ) => reject(listenerError),
    );

    harness.subscribe(() => ({ then }));
    harness.emit();

    await vi.waitFor(() => {
      expect(then).toHaveBeenCalledOnce();
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining(harness.errorContext),
        listenerError,
      );
    });
  });
});
