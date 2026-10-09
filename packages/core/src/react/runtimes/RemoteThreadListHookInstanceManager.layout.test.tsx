// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { StrictMode, useLayoutEffect, useState, type ReactNode } from "react";
import { expect, it } from "vitest";
import { makeAdapter } from "../../tests/remote-thread-list-test-helpers";
import type { ThreadMessage } from "../../types/message";
import { AssistantRuntimeProvider } from "../AssistantRuntimeProvider";
import { useExternalStoreRuntime } from "./useExternalStoreRuntime";
import { useRemoteThreadListRuntime } from "./useRemoteThreadListRuntime";

const EMPTY_MESSAGES: readonly ThreadMessage[] = [];

const renderCounterThread = async (wrap: (app: ReactNode) => ReactNode) => {
  const adapter = makeAdapter();
  let bump: (() => void) | undefined;
  let refreshHost!: () => void;
  let count: number | undefined;
  let runtimeHookRenders = 0;
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
        runtimeHookRenders++;
        const [value, setValue] = useState(0);
        bump = () => setValue((current) => current + 1);
        count = value;
        return useExternalStoreRuntime<ThreadMessage>({
          messages: EMPTY_MESSAGES,
          onNew: async () => {},
        });
      },
    });
    refreshHost = () => {
      const threadList = (
        runtime.threads as unknown as {
          _core: {
            _hookManager: { _syncHostThreads: () => void };
          };
        }
      )._core;
      threadList._hookManager._syncHostThreads();
    };
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <LayoutProbe onLayout={bumpOnLayout} />
      </AssistantRuntimeProvider>
    );
  };

  await act(async () => {
    render(wrap(<App />));
  });

  return {
    count,
    refreshHost,
    getRuntimeHookRenders: () => runtimeHookRenders,
  };
};

it("lets a descendant layout effect update a hosted thread on the mount commit", async () => {
  expect((await renderCounterThread((app) => app)).count).toBe(1);
});

it("keeps the hosted thread committed through StrictMode's effect replay", async () => {
  const { count } = await renderCounterThread((app) => (
    <StrictMode>{app}</StrictMode>
  ));
  expect(count).toBe(2);
});

it("skips remote thread resources on a parent render with unchanged inputs", async () => {
  const { refreshHost, getRuntimeHookRenders } = await renderCounterThread(
    (app) => app,
  );
  const initialRenders = getRuntimeHookRenders();

  await act(async () => {
    refreshHost();
  });

  expect(getRuntimeHookRenders()).toBe(initialRenders);
});
