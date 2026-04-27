// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { type FC, type PropsWithChildren, useState } from "react";
import { describe, expect, it } from "vitest";
import { useRemoteThreadListRuntime } from "@assistant-ui/core/react";
import { makeAdapter } from "@assistant-ui/core/tests/remote-thread-list-test-helpers";
import type { AssistantRuntime } from "@assistant-ui/core";
import { AssistantRuntimeProvider } from "../context";
import { useLocalRuntime } from "../legacy-runtime/runtime-cores/local/useLocalRuntime";
import { useAssistantRuntime } from "../legacy-runtime/hooks/AssistantContext";
import type { ChatModelAdapter, RemoteThreadListAdapter } from "../index";

const noOpAdapter: ChatModelAdapter = {
  async *run() {},
};

const useTestRuntimeHook = () => useLocalRuntime(noOpAdapter);

const RuntimeProvider: FC<
  PropsWithChildren<{ adapter: RemoteThreadListAdapter }>
> = ({ children, adapter }) => {
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: useTestRuntimeHook,
    adapter,
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

const RuntimeCapture: FC<{
  runtimeRef: { current: AssistantRuntime | null };
}> = ({ runtimeRef }) => {
  const runtime = useAssistantRuntime();
  runtimeRef.current = runtime;
  return null;
};

// regression for #3678: deferred unstable_Provider must not strand the runtime binder.
describe("useRemoteThreadListRuntime with a deferred unstable_Provider", () => {
  it("composer.setText does not throw EMPTY_THREAD_ERROR when unstable_Provider defers children", () => {
    const Provider: FC<PropsWithChildren> = ({ children }) => {
      const [ready] = useState(false);
      if (!ready) return null;
      return <>{children}</>;
    };
    const adapter = makeAdapter({ unstable_Provider: Provider });

    const runtimeRef: { current: AssistantRuntime | null } = { current: null };
    render(
      <RuntimeProvider adapter={adapter}>
        <RuntimeCapture runtimeRef={runtimeRef} />
      </RuntimeProvider>,
    );

    const runtime = runtimeRef.current;
    expect(runtime).toBeTruthy();
    expect(() => runtime!.thread.composer.setText("hello")).not.toThrow();
  });

  it("composer.setText still works when unstable_Provider renders children unconditionally", () => {
    const Provider: FC<PropsWithChildren> = ({ children }) => <>{children}</>;
    const adapter = makeAdapter({ unstable_Provider: Provider });

    const runtimeRef: { current: AssistantRuntime | null } = { current: null };
    render(
      <RuntimeProvider adapter={adapter}>
        <RuntimeCapture runtimeRef={runtimeRef} />
      </RuntimeProvider>,
    );

    const runtime = runtimeRef.current;
    expect(runtime).toBeTruthy();
    expect(() => runtime!.thread.composer.setText("hello")).not.toThrow();
  });
});
