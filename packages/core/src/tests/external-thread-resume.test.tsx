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
});
