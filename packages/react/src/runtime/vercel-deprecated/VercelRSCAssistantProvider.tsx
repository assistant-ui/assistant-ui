"use client";

import type { PropsWithChildren } from "react";
import { AssistantRuntimeProvider } from "../core/AssistantRuntimeProvider";
import type { VercelRSCAdapter } from "../vercel-ai/rsc/VercelRSCAdapter";
import type { VercelRSCMessage } from "../vercel-ai/rsc/VercelRSCMessage";
import { useVercelRSCRuntime } from "../vercel-ai/rsc/useVercelRSCRuntime";

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
