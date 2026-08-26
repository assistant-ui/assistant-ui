// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { startTransition, Suspense, useState } from "react";
import { describe, expect, it } from "vitest";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { makeAdapter } from "../../tests/remote-thread-list-test-helpers";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";

const EMPTY_MESSAGES: readonly never[] = [];

describe("useRemoteThreadListRuntime concurrent rendering", () => {
  it("keeps the committed runtime hook during an interrupted render", async () => {
    const adapter = makeAdapter();
    const pending = new Promise<never>(() => {});
    const renderedScopes: string[] = [];
    let rerenderThread: (() => void) | undefined;

    const Probe = ({ scope, suspend }: { scope: string; suspend: boolean }) => {
      const runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: function RuntimeHook() {
          const [, setVersion] = useState(0);
          rerenderThread = () => setVersion((version) => version + 1);
          renderedScopes.push(scope);
          return useExternalStoreRuntime({
            messages: EMPTY_MESSAGES,
            isRunning: false,
            onNew: async () => {},
          });
        },
      });
      if (suspend) throw pending;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <span>{scope}</span>
        </AssistantRuntimeProvider>
      );
    };

    let view: ReturnType<typeof render> | undefined;
    try {
      const mountedView = render(
        <Suspense fallback={null}>
          <Probe scope="workspace-a" suspend={false} />
        </Suspense>,
      );
      view = mountedView;

      await waitFor(() => expect(renderedScopes).toContain("workspace-a"));

      act(() => {
        startTransition(() => {
          mountedView.rerender(
            <Suspense fallback={null}>
              <Probe scope="workspace-b" suspend />
            </Suspense>,
          );
        });
      });
      expect(mountedView.container.textContent).toBe("workspace-a");

      act(() => rerenderThread?.());
      expect(renderedScopes.at(-1)).toBe("workspace-a");

      mountedView.rerender(
        <Suspense fallback={null}>
          <Probe scope="workspace-b" suspend={false} />
        </Suspense>,
      );
      await waitFor(() => expect(renderedScopes.at(-1)).toBe("workspace-b"));
    } finally {
      view?.unmount();
    }
  });
});
