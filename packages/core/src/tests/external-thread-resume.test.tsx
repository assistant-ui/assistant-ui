// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiProvider, useAui } from "@assistant-ui/store";
import { ExternalThread } from "../store/clients/external-thread";
import { useComposerResume } from "../react/primitive-hooks/useComposerResume";
import { ExternalStoreThreadRuntimeCore } from "../runtimes/external-store/external-store-thread-runtime-core";
import type { ThreadMessage } from "../types/message";
import { getThreadRuntimeCoreIsRunning } from "../runtime/api/thread-runtime";

let action!: ReturnType<typeof useComposerResume>;
let aui!: ReturnType<typeof useAui>;
const Capture = () => {
  aui = useAui();
  action = useComposerResume();
  return null;
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
    let pending!: Promise<void>;
    let duplicate!: Promise<void>;
    act(() => {
      pending = first.resume();
      duplicate = second.resume();
    });
    await waitFor(() => expect(onResume).toHaveBeenCalledOnce());
    expect(first.disabled).toBe(true);
    expect(second.disabled).toBe(true);
    let duplicateSettled = false;
    void duplicate.then(() => {
      duplicateSettled = true;
    });
    await Promise.resolve();
    expect(duplicateSettled).toBe(false);
    expect(onResume).toHaveBeenCalledOnce();
    await act(async () => {
      finish();
      await Promise.all([pending, duplicate]);
    });
    expect(duplicateSettled).toBe(true);
    expect(second.disabled).toBe(false);
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
    await act(async () => action.resume());
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
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
    let pending!: Promise<void>;
    act(() => {
      pending = first.resume();
    });
    await act(async () => second.resume());
    expect(onSecondResume).toHaveBeenCalledOnce();
    await act(async () => {
      finish();
      await pending;
    });
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
      await act(async () => action.resume());
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
    render(
      <App options={{ messages: [], canResume: true, onResume, onNew }} />,
    );
    await waitFor(() => expect(action.disabled).toBe(false));
    let pending!: Promise<void>;
    act(() => {
      pending = action.resume();
    });
    const duplicate = action.resume();
    await waitFor(() => expect(action.disabled).toBe(true));
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(onNew).not.toHaveBeenCalled();
    const outcomes = Promise.allSettled([pending, duplicate]);
    await act(async () => reject(new Error("resume failed")));
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
    await act(async () => action.resume());
    expect(onResume).not.toHaveBeenCalled();
    expect(aui.composer.getState().text).toBe("new request");
  });

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

  it("guards concurrent external-store resume calls on the thread runtime", async () => {
    let finish!: () => void;
    const onResume = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const runtime = new ExternalStoreThreadRuntimeCore(
      { getModelContext: () => ({}) },
      { messages: [], onNew: vi.fn(), onResume, canResume: true },
    );
    const config = { parentId: null, sourceId: null, runConfig: {} };
    const pending = runtime.resumeRun(config);
    expect(runtime.canResume).toBe(false);
    const duplicate = runtime.resumeRun(config);
    await Promise.resolve();
    expect(onResume).toHaveBeenCalledOnce();
    finish();
    await Promise.all([pending, duplicate]);
    expect(runtime.canResume).toBe(true);
  });

  it("shares a failed external-store resume with concurrent callers", async () => {
    let fail!: (error: Error) => void;
    const onResume = vi.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          fail = reject;
        }),
    );
    const runtime = new ExternalStoreThreadRuntimeCore(
      { getModelContext: () => ({}) },
      { messages: [], onNew: vi.fn(), onResume, canResume: true },
    );
    const config = { parentId: null, sourceId: null, runConfig: {} };
    const pending = runtime.resumeRun(config);
    const duplicate = runtime.resumeRun(config);
    await Promise.resolve();
    expect(onResume).toHaveBeenCalledOnce();
    fail(new Error("reconnect failed"));
    await expect(pending).rejects.toThrow("reconnect failed");
    await expect(duplicate).rejects.toThrow("reconnect failed");
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
