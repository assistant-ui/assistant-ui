import { type FC, type ReactNode, useRef } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type AssistantRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";

export type WrapperOptions = {
  chatModelAdapter: ChatModelAdapter;
  runtimeRef: { current: AssistantRuntime | null };
};

export function createWrapper(
  options: WrapperOptions,
): FC<{ children: ReactNode }> {
  const { chatModelAdapter, runtimeRef } = options;
  return function HarnessWrapper({ children }) {
    const runtime = useLocalRuntime(chatModelAdapter);
    const captured = useRef(false);
    if (!captured.current) {
      runtimeRef.current = runtime;
      captured.current = true;
    }
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    );
  };
}
