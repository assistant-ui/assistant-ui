"use client";

import {
  type VercelRSCAdapter,
  type VercelRSCMessage,
  useVercelRSCRuntime,
} from "@assistant-ui/react-ai-sdk";
import type { PropsWithChildren } from "react";
import { AssistantRuntimeProvider } from "../../context/providers/AssistantRuntimeProvider";

/**
 * @deprecated Will be removed in 0.1.0.
 */
export type VercelRSCAssistantProviderProps<T> = PropsWithChildren<
  VercelRSCAdapter<T>
>;

/**
 * @deprecated Replaced with `const runtime = useVercelRSCRuntime({ messages, append })` and `<AssistantRuntimeProvider runtime={runtime} />`. Will be removed in 0.1.0.
 */
export const VercelRSCAssistantProvider = <
  T extends WeakKey = VercelRSCMessage,
>({
  children,
  ...adapter
}: VercelRSCAssistantProviderProps<T>) => {
  const runtime = useVercelRSCRuntime<T>(adapter as VercelRSCAdapter<T>);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};
