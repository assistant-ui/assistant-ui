// @vitest-environment jsdom

import { act, render, renderHook } from "@testing-library/react";
import { startTransition, Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type { AssistantRuntime } from "@assistant-ui/core";
import { useLangGraphRuntime } from "./useLangGraphRuntime";
import { mockStreamCallbackFactory } from "./testUtils";

const emptyStream = () => vi.fn(() => mockStreamCallbackFactory([])());

describe("useLangGraphRuntime committed refs", () => {
  it("dispatches through the committed stream after an abandoned render", async () => {
    const streamA = emptyStream();
    const streamB = emptyStream();
    const host = renderHook(() =>
      useLangGraphRuntime({ stream: emptyStream() }),
    );

    const pending = new Promise<never>(() => {});
    let blocked = false;
    const interruptedRender = vi.fn();
    const Blocker = () => {
      if (blocked) {
        interruptedRender();
        throw pending;
      }
      return null;
    };

    const capture: { runtime: AssistantRuntime | null } = { runtime: null };
    const Nested = ({ stream }: { stream: typeof streamA }) => {
      capture.runtime = useLangGraphRuntime({ stream });
      return null;
    };
    const Tree = ({ stream }: { stream: typeof streamA }) => (
      <AssistantRuntimeProvider runtime={host.result.current}>
        <Suspense fallback={null}>
          <Nested stream={stream} />
          <Blocker />
        </Suspense>
      </AssistantRuntimeProvider>
    );

    const view = render(<Tree stream={streamA} />);
    expect(capture.runtime).not.toBeNull();

    act(() => {
      blocked = true;
      startTransition(() => view.rerender(<Tree stream={streamB} />));
    });
    expect(interruptedRender).toHaveBeenCalled();

    await act(async () => {
      await capture.runtime!.thread.append("hello");
    });

    expect(streamA).toHaveBeenCalledOnce();
    expect(streamB).not.toHaveBeenCalled();

    await act(async () => {
      blocked = false;
      view.rerender(<Tree stream={streamB} />);
    });
    await act(async () => {
      await capture.runtime!.thread.append("second");
    });

    expect(streamB).toHaveBeenCalledOnce();
    view.unmount();
    host.unmount();
  });
});
