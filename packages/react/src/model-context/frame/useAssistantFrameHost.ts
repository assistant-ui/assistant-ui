"use client";

import { useEffect, RefObject } from "react";
import { useAssistantRuntime } from "../../context/react/AssistantContext";
import { AssistantFrameHost } from "./AssistantFrameHost";

type UseAssistantFrameHostOptions = {
  iframeRef: Readonly<RefObject<HTMLIFrameElement | null | undefined>>;
  targetOrigin?: string;
};

/**
 * React hook that manages the lifecycle of an AssistantFrameHost and its binding to the current AssistantRuntime.
 *
 * Usage example:
 * ```typescript
 * function MyComponent() {
 *   const iframeRef = useRef<HTMLIFrameElement>(null);
 *
 *   useAssistantFrameHost({
 *     iframeRef,
 *     targetOrigin: "https://trusted-domain.com", // optional
 *   });
 *
 *   return <iframe ref={iframeRef} src="..." />;
 * }
 * ```
 */
export const useAssistantFrameHost = ({
  iframeRef,
  targetOrigin = "*",
}: UseAssistantFrameHostOptions): void => {
  const runtime = useAssistantRuntime();

  useEffect(() => {
    const iframeWindow = iframeRef.current?.contentWindow;

    // Only create host if we have both runtime and iframe window
    if (!runtime || !iframeWindow) {
      return;
    }

    // Create new frame host
    const frameHost = new AssistantFrameHost(iframeWindow, targetOrigin);

    // Register with runtime
    const unsubscribe = runtime.registerModelContextProvider(frameHost);

    // Cleanup on unmount or when dependencies change
    return () => {
      frameHost.dispose();
      unsubscribe();
    };
  }, [runtime, iframeRef, targetOrigin]);
};
