// @vitest-environment jsdom

import { StrictMode } from "react";
import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { ThreadMessage } from "../../types/message";
import { RuntimeAdapterProvider } from "./RuntimeAdapterProvider";

const userMessage: ThreadMessage = {
  id: "user-1",
  role: "user",
  content: [{ type: "text", text: "hello" }],
  attachments: [],
  createdAt: new Date(0),
  metadata: { custom: {} },
};

describe("useExternalStoreRuntime lifecycle", () => {
  it("uses feedback supplied by the per-thread adapter context", () => {
    const submit = vi.fn();
    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    const App = () => {
      const runtime = useExternalStoreRuntime({
        messages: [userMessage],
        onNew: async () => {},
      });
      capture.runtime = runtime;
      return null;
    };

    render(
      <RuntimeAdapterProvider adapters={{ feedback: { submit } }}>
        <App />
      </RuntimeAdapterProvider>,
    );

    expect(capture.runtime!.thread.getState().capabilities.feedback).toBe(true);
    act(() => {
      capture
        .runtime!.thread.getMessageById("user-1")
        .submitFeedback({ type: "positive" });
    });
    expect(submit).toHaveBeenCalledWith({
      message: expect.objectContaining({ id: "user-1" }),
      type: "positive",
    });
  });

  it("keeps dispatching appends after StrictMode's simulated remount", async () => {
    const onNew = vi.fn(async () => {});
    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    const App = () => {
      const runtime = useExternalStoreRuntime({ messages: [], onNew });
      capture.runtime = runtime;
      return null;
    };
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
    expect(capture.runtime).not.toBeNull();

    await act(async () => {
      await capture.runtime!.thread.append({
        role: "user",
        content: [{ type: "text", text: "hello" }],
      });
    });

    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("dispatches an append before unmount", async () => {
    let resolveInitialization!: () => void;
    const initialization = new Promise<void>((resolve) => {
      resolveInitialization = resolve;
    });
    const onNew = vi.fn(async () => {});
    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    const App = () => {
      const runtime = useExternalStoreRuntime({ messages: [], onNew });
      capture.runtime = runtime;
      return null;
    };
    const view = render(<App />);
    expect(capture.runtime).not.toBeNull();
    const core = (
      capture.runtime!.thread as unknown as {
        __internal_threadBinding: {
          getState(): {
            __internal_setGetInitializePromise(
              getPromise: () => Promise<unknown> | undefined,
            ): void;
            append(message: unknown): Promise<void>;
          };
        };
      }
    ).__internal_threadBinding.getState();
    core.__internal_setGetInitializePromise(() => initialization);

    const appendPromise = core.append({
      parentId: null,
      sourceId: null,
      runConfig: {},
      role: "user",
      content: [{ type: "text", text: "hello" }],
      attachments: [],
      metadata: { custom: {} },
      createdAt: new Date(0),
    });
    await Promise.resolve();

    expect(onNew).toHaveBeenCalledTimes(1);

    view.unmount();
    resolveInitialization();

    await appendPromise;
    expect(onNew).toHaveBeenCalledTimes(1);
  });
});
