// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { AuiProvider, useAui } from "@assistant-ui/store";
import { ExternalThread } from "../../store/clients/external-thread";
import { useComposerResume } from "./useComposerResume";
import { ExternalStoreThreadRuntimeCore } from "../../runtimes/external-store/external-store-thread-runtime-core";
import type { ThreadMessage } from "../../types/message";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { AssistantRuntimeImpl } from "../../runtime/api/assistant-runtime";
import { ExternalStoreRuntimeCore } from "../../runtimes/external-store/external-store-runtime-core";
import { getThreadRuntimeCoreIsRunning } from "../../runtime/api/thread-runtime";
import type { ThreadRuntimeState } from "../../runtime/api/thread-runtime";
import type { ThreadState } from "../../store/scopes/thread";
import { fromThreadMessageLike } from "../../runtime/utils/thread-message-like";

let action!: ReturnType<typeof useComposerResume>;
let aui!: ReturnType<typeof useAui>;
const Capture = () => {
  aui = useAui();
  action = useComposerResume();
  return (
    <button disabled={action.disabled} onClick={action.resume}>
      Resume
    </button>
  );
};
const App = ({
  options,
}: {
  options: Parameters<typeof ExternalThread>[0];
}) => {
  const value = useAui({ thread: ExternalThread(options) });
  return (
    <AuiProvider value={value}>
      <Capture />
    </AuiProvider>
  );
};
afterEach(cleanup);

describe("checkpoint resume", () => {
  it("accepts thread state from clients without checkpoint support", () => {
    expectTypeOf<Omit<ThreadState, "canResume">>().toExtend<ThreadState>();
    expectTypeOf<
      Omit<ThreadRuntimeState, "canResume">
    >().not.toExtend<ThreadRuntimeState>();
    expectTypeOf<ThreadRuntimeState["canResume"]>().toEqualTypeOf<boolean>();
    expectTypeOf<ThreadState["canResume"]>().toEqualTypeOf<
      boolean | undefined
    >();
    expectTypeOf<
      ReturnType<typeof useComposerResume>["resume"]
    >().returns.toBeVoid();
  });

  it.each([undefined, false])(
    "preserves synchronous repeated ExternalThread calls without opt-in: %s",
    (canResume) => {
      const onResume = vi.fn();
      render(<App options={{ messages: [], onResume, canResume }} />);
      act(() => {
        expect(aui.thread().resumeRun({ parentId: null })).toBeUndefined();
        expect(onResume).toHaveBeenCalledTimes(1);
        aui.thread().resumeRun({ parentId: null });
        expect(onResume).toHaveBeenCalledTimes(2);
      });
    },
  );

  it("returns the adapter's resume task without opt-in", async () => {
    const onResume = vi.fn(async () => {
      throw new Error("resume failed");
    });
    render(<App options={{ messages: [], onResume, canResume: false }} />);
    await expect(
      Promise.resolve(aui.thread().resumeRun({ parentId: null })),
    ).rejects.toThrow("resume failed");
  });

  it("reports a failed resume instead of leaving it unhandled", async () => {
    const error = new Error("resume failed");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const onResume = vi.fn(async () => {
      throw error;
    });
    render(<App options={{ messages: [], onResume, canResume: true }} />);
    await waitFor(() => expect(action.disabled).toBe(false));
    act(() => action.resume());
    await waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        "[assistant-ui] Resume failed",
        error,
      ),
    );
    consoleError.mockRestore();
  });

  it.each([undefined, false])(
    "does not coalesce existing runtime calls without opt-in: %s",
    async (canResume) => {
      const onResume = vi.fn(async () => {});
      const runtime = new ExternalStoreThreadRuntimeCore(
        { getModelContext: () => ({}) },
        { messages: [], onNew: vi.fn(), canResume, onResume },
      );
      const config = { parentId: null, sourceId: null, runConfig: {} };
      const first = runtime.resumeRun(config);
      const second = runtime.resumeRun(config);
      expect(onResume).toHaveBeenCalledTimes(2);
      await Promise.all([first, second]);
    },
  );

  it.each([false, true])(
    "coalesces opt-in requests when availability clears: %s",
    async (clearAvailability) => {
      let finish!: () => void;
      const onResume = vi.fn(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      );
      const onNew = vi.fn();
      const runtime = new ExternalStoreThreadRuntimeCore(
        { getModelContext: () => ({}) },
        { messages: [], onNew, canResume: true, onResume },
      );
      const first = runtime.resumeRun({
        parentId: null,
        sourceId: null,
        runConfig: {},
      });
      if (clearAvailability) {
        runtime.__internal_setAdapter({
          messages: [],
          onNew,
          onResume,
          canResume: false,
        });
      }
      const second = runtime.resumeRun({
        parentId: null,
        sourceId: null,
        runConfig: {},
      });
      expect(onResume).toHaveBeenCalledOnce();
      finish();
      await Promise.all([first, second]);
      expect(runtime.canResume).toBe(!clearAvailability);
    },
  );

  it("shares pending state across resume controls for the same thread", async () => {
    let finish!: () => void;
    const onResume = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    let first!: ReturnType<typeof useComposerResume>;
    let second!: ReturnType<typeof useComposerResume>;
    const FirstControl = () => {
      first = useComposerResume();
      return null;
    };
    const SecondControl = () => {
      second = useComposerResume();
      return null;
    };
    const TwoControls = () => {
      const value = useAui({
        thread: ExternalThread({ messages: [], canResume: true, onResume }),
      });
      return (
        <AuiProvider value={value}>
          <FirstControl />
          <SecondControl />
        </AuiProvider>
      );
    };
    render(<TwoControls />);
    act(() => {
      expect(first.resume()).toBeUndefined();
      expect(second.resume()).toBeUndefined();
      expect(onResume).toHaveBeenCalledOnce();
    });
    await waitFor(() => {
      expect(first.disabled).toBe(true);
      expect(second.disabled).toBe(true);
    });
    await Promise.resolve();
    expect(first.disabled).toBe(true);
    expect(second.disabled).toBe(true);
    expect(onResume).toHaveBeenCalledOnce();
    act(() => finish());
    await waitFor(() => {
      expect(first.disabled).toBe(false);
      expect(second.disabled).toBe(false);
    });
  });

  it("blocks repeated Resume controls through the external-store runtime bridge", async () => {
    let finish!: () => void;
    const onResume = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const runtime = new AssistantRuntimeImpl(
      new ExternalStoreRuntimeCore({
        messages: [],
        onNew: vi.fn(),
        onResume,
        canResume: true,
      }),
    );
    render(
      <AssistantRuntimeProvider runtime={runtime}>
        <Capture />
      </AssistantRuntimeProvider>,
    );
    act(() => {
      action.resume();
      action.resume();
    });
    expect(onResume).toHaveBeenCalledOnce();
    expect(action.disabled).toBe(true);
    act(() => finish());
    await waitFor(() => expect(action.disabled).toBe(false));
  });

  it("allows resuming a new thread while the previous thread is pending", async () => {
    let finishFirst!: () => void;
    const firstResume = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishFirst = resolve;
        }),
    );
    const secondResume = vi.fn(async () => {});
    const adapter = (threadId: string) => ({
      messages: [],
      onNew: vi.fn(),
      canResume: true,
      onResume: threadId === "first" ? firstResume : secondResume,
      adapters: {
        threadList: {
          threadId,
          threads: [
            { id: "first", status: "regular" as const },
            { id: "second", status: "regular" as const },
          ],
        },
      },
    });
    const core = new ExternalStoreRuntimeCore(adapter("first"));
    const runtime = new AssistantRuntimeImpl(core);
    render(
      <AssistantRuntimeProvider runtime={runtime}>
        <Capture />
      </AssistantRuntimeProvider>,
    );
    act(() => {
      action.resume();
    });
    act(() => {
      core.setAdapter(adapter("second"));
    });
    act(() => {
      action.resume();
    });
    await waitFor(() => {
      expect(firstResume).toHaveBeenCalledOnce();
      expect(secondResume).toHaveBeenCalledOnce();
    });
    act(() => finishFirst());
    await waitFor(() => expect(action.disabled).toBe(false));
  });

  it("uses the latest callback when checkpoint availability is unchanged", async () => {
    const messages: ThreadMessage[] = [];
    const first = vi.fn(async () => {});
    const second = vi.fn(async () => {});
    const { rerender } = render(
      <App options={{ messages, canResume: true, onResume: first }} />,
    );
    const state = aui.thread.getState();
    rerender(<App options={{ messages, canResume: true, onResume: second }} />);
    expect(aui.thread.getState().canResume).toBe(state.canResume);
    act(() => {
      action.resume();
    });
    expect(first).not.toHaveBeenCalled();
    await waitFor(() => expect(second).toHaveBeenCalledOnce());
  });

  it("does not share pending controls between providers with the same thread id", async () => {
    let finish!: () => void;
    const onFirstResume = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const onSecondResume = vi.fn(async () => {});
    render(
      <App
        options={{ messages: [], canResume: true, onResume: onFirstResume }}
      />,
    );
    const first = action;
    render(
      <App
        options={{ messages: [], canResume: true, onResume: onSecondResume }}
      />,
    );
    const second = action;
    act(() => {
      first.resume();
    });
    act(() => {
      second.resume();
    });
    await waitFor(() => expect(onSecondResume).toHaveBeenCalledOnce());
    act(() => finish());
    await waitFor(() => expect(action.disabled).toBe(false));
  });

  it.each([
    { canResume: false, onResume: vi.fn() },
    { canResume: true },
    { canResume: true, onResume: vi.fn(), isRunning: true },
    { canResume: true, onResume: vi.fn(), isLoading: true },
  ])(
    "does not expose resume without an idle checkpoint: %j",
    async (options) => {
      render(<App options={{ messages: [], ...options }} />);
      await waitFor(() => expect(action.disabled).toBe(true));
      fireEvent.click(screen.getByRole("button", { name: "Resume" }));
      if (options.onResume) expect(options.onResume).not.toHaveBeenCalled();
    },
  );

  it("resumes exactly once without sending a user message and unlocks after failure", async () => {
    let reject!: (reason: Error) => void;
    const onResume = vi.fn(
      () =>
        new Promise<void>((_, fail) => {
          reject = fail;
        }),
    );
    const onNew = vi.fn();
    const core = new ExternalStoreRuntimeCore({
      messages: [],
      canResume: true,
      onResume,
      onNew,
    });
    const resumeRun = vi.spyOn(
      core.threads.getMainThreadRuntimeCore(),
      "resumeRun",
    );
    render(
      <AssistantRuntimeProvider runtime={new AssistantRuntimeImpl(core)}>
        <Capture />
      </AssistantRuntimeProvider>,
    );
    await waitFor(() => expect(action.disabled).toBe(false));
    act(() => {
      action.resume();
      action.resume();
    });
    await waitFor(() => expect(action.disabled).toBe(true));
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(onNew).not.toHaveBeenCalled();
    const outcomes = Promise.allSettled(
      resumeRun.mock.results.map((result) => result.value),
    );
    await act(async () => {
      reject(new Error("resume failed"));
      await outcomes;
    });
    expect(await outcomes).toEqual([
      expect.objectContaining({
        status: "rejected",
        reason: expect.objectContaining({ message: "resume failed" }),
      }),
      expect.objectContaining({
        status: "rejected",
        reason: expect.objectContaining({ message: "resume failed" }),
      }),
    ]);
    expect(action.disabled).toBe(false);
  });

  it("preserves a composer draft instead of resuming over it", async () => {
    const onResume = vi.fn();
    render(<App options={{ messages: [], canResume: true, onResume }} />);
    await act(async () => aui.composer.setText("new request"));
    expect(action.disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(onResume).not.toHaveBeenCalled();
    expect(aui.composer.getState().text).toBe("new request");
  });

  it.each([null, "answer"])(
    "forwards the latest parent id %s without an imperative disabled guard",
    async (parentId) => {
      const onResume = vi.fn(async () => {});
      const messages: ThreadMessage[] =
        parentId === null
          ? []
          : [
              fromThreadMessageLike(
                {
                  role: "assistant",
                  createdAt: new Date(0),
                  content: "Partial",
                },
                parentId,
                { type: "incomplete", reason: "cancelled" },
              ),
            ];
      render(<App options={{ messages, canResume: true, onResume }} />);
      await act(async () => {
        aui.composer.setText("new request");
      });
      expect(action.disabled).toBe(true);
      act(() => {
        expect(action.resume()).toBeUndefined();
      });
      await waitFor(() =>
        expect(onResume).toHaveBeenCalledExactlyOnceWith({ parentId }),
      );
      await waitFor(() => expect(aui.thread.getState().canResume).toBe(true));
      expect(aui.composer.getState().text).toBe("new request");
    },
  );

  it("exposes the same checkpoint gate on the external-store runtime", () => {
    const provider = { getModelContext: () => ({}) };
    const onNew = vi.fn();
    const onResume = vi.fn(async () => {});
    const runtime = new ExternalStoreThreadRuntimeCore(provider, {
      messages: [],
      onNew,
      canResume: true,
    });
    expect(runtime.canResume).toBe(false);
    runtime.__internal_setAdapter({
      messages: [],
      onNew,
      onResume,
      canResume: true,
    });
    expect(runtime.canResume).toBe(true);
    runtime.__internal_setAdapter({
      messages: [],
      onNew,
      onResume,
      canResume: true,
      isRunning: true,
    });
    expect(runtime.canResume).toBe(false);
  });

  it.each([undefined, false])(
    "forwards each external-store resume config when canResume is %s",
    async (canResume) => {
      let finishFirst!: () => void;
      let finishSecond!: () => void;
      const onResume = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<void>((resolve) => {
              finishFirst = resolve;
            }),
        )
        .mockImplementationOnce(
          () =>
            new Promise<void>((resolve) => {
              finishSecond = resolve;
            }),
        );
      const runtime = new ExternalStoreThreadRuntimeCore(
        { getModelContext: () => ({}) },
        { messages: [], onNew: vi.fn(), onResume, canResume },
      );
      const first = { parentId: null, sourceId: null, runConfig: {} };
      const second = {
        parentId: null,
        sourceId: null,
        runConfig: { custom: { mode: "second" } },
      };
      const pending = runtime.resumeRun(first);
      expect(onResume).toHaveBeenNthCalledWith(1, first);
      expect(runtime.canResume).toBe(false);
      const next = runtime.resumeRun(second);
      expect(onResume).toHaveBeenNthCalledWith(2, second);
      finishFirst();
      await pending;
      expect(runtime.canResume).toBe(false);
      finishSecond();
      await next;
      expect(runtime.canResume).toBe(false);
    },
  );

  it.each([undefined, false])(
    "keeps legacy resume requests independent after one fails with canResume=%s",
    async (canResume) => {
      let failFirst!: (error: Error) => void;
      let finishSecond!: () => void;
      const onResume = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<void>((_resolve, reject) => {
              failFirst = reject;
            }),
        )
        .mockImplementationOnce(
          () =>
            new Promise<void>((resolve) => {
              finishSecond = resolve;
            }),
        );
      const runtime = new ExternalStoreThreadRuntimeCore(
        { getModelContext: () => ({}) },
        { messages: [], onNew: vi.fn(), onResume, canResume },
      );
      const config = { parentId: null, sourceId: null, runConfig: {} };
      const pending = runtime.resumeRun(config);
      const next = runtime.resumeRun({
        ...config,
        runConfig: { custom: { mode: "second" } },
      });
      expect(onResume).toHaveBeenCalledTimes(2);
      failFirst(new Error("reconnect failed"));
      await expect(pending).rejects.toThrow("reconnect failed");
      expect(runtime.canResume).toBe(false);
      finishSecond();
      await next;
      expect(runtime.canResume).toBe(false);
    },
  );

  it("restores resume availability after a synchronous adapter error", async () => {
    const runtime = new ExternalStoreThreadRuntimeCore(
      { getModelContext: () => ({}) },
      {
        messages: [],
        onNew: vi.fn(),
        canResume: true,
        onResume: () => {
          throw new Error("invalid checkpoint");
        },
      },
    );
    await expect(
      runtime.resumeRun({ parentId: null, sourceId: null, runConfig: {} }),
    ).rejects.toThrow("invalid checkpoint");
    expect(runtime.canResume).toBe(true);
  });

  it.each([undefined, false])(
    "uses the public running fallback when isRunning is %s",
    (isRunning) => {
      const runtime = new ExternalStoreThreadRuntimeCore(
        { getModelContext: () => ({}) },
        {
          messages: [
            {
              id: "answer",
              role: "assistant",
              createdAt: new Date(0),
              content: [{ type: "text", text: "Partial" }],
              status: { type: "running" },
              metadata: { custom: {} },
            },
          ],
          onNew: vi.fn(),
          onResume: vi.fn(async () => {}),
          canResume: true,
          isRunning,
        },
      );
      expect(getThreadRuntimeCoreIsRunning(runtime)).toBe(
        isRunning === undefined,
      );
      expect(runtime.canResume).toBe(isRunning === false);
    },
  );
});
