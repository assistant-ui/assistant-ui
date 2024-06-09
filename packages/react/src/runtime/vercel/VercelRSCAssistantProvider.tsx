"use client";

import type { PropsWithChildren } from "react";
import { AssistantRuntimeProvider } from "../core/AssistantRuntimeProvider";
import type {
  VercelRSCAdapter,
  VercelRSCMessage,
} from "../core/vercel-rsc/VercelRSCRuntime";
import { useVercelRSCRuntime } from "../core/vercel-rsc/useVercelRSCRuntime";

export type VercelRSCAssistantProviderProps<T> = PropsWithChildren<
  VercelRSCAdapter<T>
>;

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
