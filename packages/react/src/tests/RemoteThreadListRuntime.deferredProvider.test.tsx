// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import { type FC, type PropsWithChildren, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRemoteThreadListRuntime } from "@assistant-ui/core/react";
import { makeAdapter } from "./remote-thread-list-test-helpers";
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

afterEach(() => {
  vi.useRealTimers();
});

describe("useRemoteThreadListRuntime with unstable_Provider", () => {
  it("composer.setText works when unstable_Provider renders children unconditionally", () => {
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

  it("warns in dev when unstable_Provider defers children", () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const Provider: FC<PropsWithChildren> = ({ children }) => {
      const [ready] = useState(false);
      if (!ready) return null;
      return <>{children}</>;
    };
    const adapter = makeAdapter({ unstable_Provider: Provider });

    render(
      <RuntimeProvider adapter={adapter}>
        <div />
      </RuntimeProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("did not render its `children` synchronously"),
    );

    warn.mockRestore();
  });
});
