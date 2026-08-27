// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { Suspense, startTransition, use, useSyncExternalStore } from "react";
import { describe, expect, it } from "vitest";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";
import {
  deferred,
  makeAdapter,
} from "../../tests/remote-thread-list-test-helpers";

describe("useRemoteThreadListRuntime concurrent rendering", () => {
  it("keeps the committed runtime hook during an interrupted render", async () => {
    const update = {
      value: 0,
      listeners: new Set<() => void>(),
      subscribe(listener: () => void) {
        update.listeners.add(listener);
        return () => update.listeners.delete(listener);
      },
      getSnapshot() {
        return update.value;
      },
      bump() {
        update.value++;
        for (const listener of update.listeners) listener();
      },
    };
    const gate = deferred<void>();
    const observed: string[] = [];
    const adapter = makeAdapter();

    const Probe = ({ scope, suspend }: { scope: string; suspend: boolean }) => {
      const useTestThreadRuntime = () => {
        useSyncExternalStore(update.subscribe, update.getSnapshot);
        observed.push(scope);
        return useExternalStoreRuntime({
          messages: [],
          onNew: async () => {},
        });
      };
      const runtime = useRemoteThreadListRuntime({
        adapter,
        runtimeHook: useTestThreadRuntime,
      });
      if (suspend) use(gate.promise);
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };

    const mountedView = render(
      <Suspense fallback={null}>
        <Probe scope="workspace-a" suspend={false} />
      </Suspense>,
    );
    await waitFor(() => expect(observed).toContain("workspace-a"));

    await act(async () => {
      startTransition(() => {
        mountedView.rerender(
          <Suspense fallback={null}>
            <Probe scope="workspace-b" suspend />
          </Suspense>,
        );
      });
    });

    const observedBeforeUpdate = observed.length;
    await act(async () => update.bump());

    expect(observed.length).toBeGreaterThan(observedBeforeUpdate);
    expect(observed.at(-1)).toBe("workspace-a");

    await act(async () => gate.resolve());
    await waitFor(() => expect(observed.at(-1)).toBe("workspace-b"));
  });
});
