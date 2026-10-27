// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useLocalRuntime } from "./useLocalRuntime";

afterEach(() => {
  cleanup();
});

// useLocalRuntime runs on the client thread list path, and a new thread's
// first send waits on its initialization before it starts the run. That wait
// must end when the adapter answers, not a commit later, when the thread list
// reports the remote ID.
it("starts a new thread's first run once the adapter initializes the thread", async () => {
  const run = vi.fn(async function* () {});
  let runtime: AssistantRuntime | undefined;
  const App = () => {
    runtime = useLocalRuntime({ run });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {null}
      </AssistantRuntimeProvider>
    );
  };
  render(<App />);

  await act(async () => {
    await runtime!.thread.append("Hello");
  });

  expect(run).toHaveBeenCalledTimes(1);
});
