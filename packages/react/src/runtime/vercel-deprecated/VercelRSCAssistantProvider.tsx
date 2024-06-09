"use client";

import type { PropsWithChildren } from "react";
import { AssistantRuntimeProvider } from "../core/AssistantRuntimeProvider";
import type {
  VercelRSCAdapter,
  VercelRSCMessage,
} from "../vercel-ai/rsc/VercelRSCRuntime";
import { useVercelRSCRuntime } from "../vercel-ai/rsc/useVercelRSCRuntime";

// /**
//  * @deprecated Will be removed in 0.1.0.
//  */
export type VercelRSCAssistantProviderProps<T> = PropsWithChildren<
  VercelRSCAdapter<T>
>;

// TODO mark as deprecated
// /**
//  * @deprecated Replaced with `<AssistantRuntimeProvider runtime={...} />` in conjuction with `useVercelAIRSCRuntime()`. Will be removed in 0.1.0.
//  */
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
