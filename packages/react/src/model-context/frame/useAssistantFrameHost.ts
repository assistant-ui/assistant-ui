"use client";

import type { Unsubscribe } from "@assistant-ui/core";
import { useEffect, type RefObject } from "react";
import { AssistantFrameHost } from "@assistant-ui/core";

type UseAssistantFrameHostOptions = {
  iframeRef: Readonly<RefObject<HTMLIFrameElement | null | undefined>>;
  targetOrigin?: string;
  register: (frameHost: AssistantFrameHost) => Unsubscribe;
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
 *     targetOrigin: "https://trusted-domain.com",
 *   });
 *
 *   return <iframe ref={iframeRef} src="..." />;
 * }
 * ```
 */
export const useAssistantFrameHost = ({
  iframeRef,
  targetOrigin,
  register,
}: UseAssistantFrameHostOptions): void => {
  useEffect(() => {
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!iframeWindow) return;

    const frameHost = new AssistantFrameHost(iframeWindow, targetOrigin);

    const unsubscribe = register(frameHost);

    return () => {
      let disposeFailed = false;
      let disposeError: unknown;
      try {
        frameHost.dispose();
      } catch (error) {
        disposeFailed = true;
        disposeError = error;
      }

      try {
        unsubscribe();
      } catch (error) {
        if (!disposeFailed) throw error;
        console.error(
          "[assistant-ui] AssistantFrameHost unregistration failed.",
          error,
        );
      }

      if (disposeFailed) throw disposeError;
    };
  }, [iframeRef, targetOrigin, register]);
};
