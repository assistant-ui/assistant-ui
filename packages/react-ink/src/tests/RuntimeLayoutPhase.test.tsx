import { useLayoutEffect, useState } from "react";
import { afterEach, expect, it } from "vitest";
import { cleanup } from "ink-testing-library";
import type { ThreadMessage } from "@assistant-ui/core";
import { InMemoryThreadListAdapter } from "@assistant-ui/core";
import { useExternalStoreRuntime } from "@assistant-ui/core/react";
import { renderFrame } from "./helpers";
import { AssistantRuntimeProvider, useRemoteThreadListRuntime } from "../index";

const EMPTY_MESSAGES: readonly ThreadMessage[] = [];
const adapter = new InMemoryThreadListAdapter();

afterEach(cleanup);

it("keeps the remote thread host visible to Ink descendant layout effects", async () => {
  let bump: (() => void) | undefined;
  let count: number | undefined;

  const LayoutProbe = () => {
    useLayoutEffect(() => {
      bump!();
    }, []);
    return null;
  };

  const App = () => {
    const runtime = useRemoteThreadListRuntime({
      adapter,
      runtimeHook: function useCounterThreadRuntime() {
        const [value, setValue] = useState(0);
        bump = () => setValue((current) => current + 1);
        count = value;
        return useExternalStoreRuntime<ThreadMessage>({
          messages: EMPTY_MESSAGES,
          onNew: async () => {},
        });
      },
    });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <LayoutProbe />
      </AssistantRuntimeProvider>
    );
  };

  await renderFrame(<App />);

  expect(count).toBe(1);
});
