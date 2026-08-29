// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import { makeAdapter } from "../../tests/remote-thread-list-test-helpers";

describe("useRemoteThreadListRuntime runtime hook republication", () => {
  it("renders thread runtimes through the latest committed runtime hook", async () => {
    const adapter = makeAdapter();
    const onNew = vi.fn(async () => {});
    const rendered: string[] = [];

    const makeRuntimeHook = (label: string) => () => {
      rendered.push(label);
      return useExternalStoreRuntime({ messages: [], onNew });
    };
    const hookA = makeRuntimeHook("A");
    const hookB = makeRuntimeHook("B");

    const runtimeRef: { current: AssistantRuntime | null } = { current: null };
    const App = ({ runtimeHook }: { runtimeHook: () => AssistantRuntime }) => {
      const runtime = useRemoteThreadListRuntime({ adapter, runtimeHook });
      runtimeRef.current = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          {null}
        </AssistantRuntimeProvider>
      );
    };

    const { rerender } = render(<App runtimeHook={hookA} />);
    await waitFor(() => {
      expect(runtimeRef.current?.threads.mainItem.getState().id).toBeDefined();
    });
    expect(rendered).toContain("A");

    rendered.length = 0;
    rerender(<App runtimeHook={hookB} />);

    await waitFor(() => {
      expect(rendered).toContain("B");
    });
  });
});
