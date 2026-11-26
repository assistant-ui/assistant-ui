"use client";

import { useMemo, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  AuiProvider,
  InMemoryThreadListAdapter,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { runScript } from "@/registry/shared/lib/demo-script";

/** The scripted replies from demo-script, as a web runtime adapter. */
const scriptedAdapter: ChatModelAdapter = {
  run: (options) => runScript(options) as ReturnType<ChatModelAdapter["run"]>,
};

const EMPTY_CONFIG = AuiConfig({});

/**
 * Wraps a block in the scripted runtime, with conversations kept in memory.
 * It starts from an empty scope, so it works inside a page that has an
 * assistant of its own.
 */
export function DemoRuntimeProvider({ children }: { children: ReactNode }) {
  return (
    <AuiProvider extends={null} config={EMPTY_CONFIG}>
      <DemoRuntime>{children}</DemoRuntime>
    </AuiProvider>
  );
}

function DemoRuntime({ children }: { children: ReactNode }) {
  const adapter = useMemo(() => new InMemoryThreadListAdapter(), []);
  const runtime = useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function DemoThreadRuntime() {
      return useLocalRuntime(scriptedAdapter);
    },
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
