// @vitest-environment jsdom

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuiProvider, useAui } from "@assistant-ui/store";
import { ExternalThread } from "../store/clients/external-thread";
import { useComposerResume } from "../react/primitive-hooks/useComposerResume";
import { ExternalStoreThreadRuntimeCore } from "../runtimes/external-store/external-store-thread-runtime-core";
import { useExternalStoreRuntime } from "../react/runtimes/useExternalStoreRuntime";
import type { ThreadMessage } from "../types/message";
import { AssistantRuntimeProvider } from "../react/AssistantRuntimeProvider";
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
    expect(onResume).toHaveBeenCalledOnce();
    expect(second.isResuming).toBe(true);
    expect(second.disabled).toBe(true);
    await act(async () => {
      await duplicate;
    });
    expect(onResume).toHaveBeenCalledOnce();
    await act(async () => {
      finish();
      await pending;
    });
    expect(first.isResuming).toBe(false);
    expect(second.isResuming).toBe(false);
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

  it("keeps pending resume actions scoped to their original thread", async () => {
    let finish!: () => void;
    const first = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const second = vi.fn(async () => {});
    const SwitchableApp = ({ id }: { id: string }) => {
      const runtime = useExternalStoreRuntime<ThreadMessage>({
        messages: [],
        onNew: async () => {},
        canResume: true,
        onResume: id === "one" ? first : second,
        adapters: {
          threadList: {
            threadId: id,
            threads: ["one", "two"].map((id) => ({
              id,
              status: "regular" as const,
            })),
          },
        },
      });
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <Capture />
        </AssistantRuntimeProvider>
      );
    };
    const { rerender } = render(<SwitchableApp id="one" />);
    await waitFor(() => expect(action.disabled).toBe(false));
    let pending!: Promise<void>;
    act(() => {
      pending = action.resume();
    });
    rerender(<SwitchableApp id="two" />);
    await waitFor(() => expect(action.disabled).toBe(false));
    await act(async () => action.resume());
    expect(second).toHaveBeenCalledTimes(1);
    rerender(<SwitchableApp id="one" />);
    await waitFor(() => expect(action.disabled).toBe(true));
    await act(async () => {
      finish();
      await pending;
    });
    expect(action.disabled).toBe(false);
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
    await act(async () => {
      await action.resume();
    });
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(onNew).not.toHaveBeenCalled();
    await act(async () => {
      reject(new Error("resume failed"));
      await expect(pending).rejects.toThrow("resume failed");
    });
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
