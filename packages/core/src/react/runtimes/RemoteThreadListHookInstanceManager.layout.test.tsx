// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { useLayoutEffect, useState } from "react";
import { expect, it } from "vitest";
import { makeAdapter } from "../../tests/remote-thread-list-test-helpers";
import type { ThreadMessage } from "../../types/message";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";

const EMPTY_MESSAGES: readonly ThreadMessage[] = [];

it("lets a descendant layout effect update a hosted thread on the mount commit", async () => {
  const adapter = makeAdapter();
  let bump: (() => void) | undefined;
  let count: number | undefined;
  const bumpOnLayout = () => bump!();

  const LayoutProbe = ({ onLayout }: { onLayout: () => void }) => {
    useLayoutEffect(() => {
      onLayout();
    }, [onLayout]);
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
        <LayoutProbe onLayout={bumpOnLayout} />
      </AssistantRuntimeProvider>
    );
  };

  await act(async () => {
    render(<App />);
  });

  expect(count).toBe(1);
});
