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
      let cleanupFailed = false;
      let cleanupError: unknown;
      const runCleanup = (
        cleanup: () => void,
        laterFailureMessage: string,
      ) => {
        try {
          cleanup();
        } catch (error) {
          if (cleanupFailed) {
            console.error(laterFailureMessage, error);
          } else {
            cleanupFailed = true;
            cleanupError = error;
          }
        }
      };

      runCleanup(
        () => frameHost.dispose(),
        "[assistant-ui] AssistantFrameHost disposal failed.",
      );
      runCleanup(
        unsubscribe,
        "[assistant-ui] AssistantFrameHost unregistration failed.",
      );

      if (cleanupFailed) throw cleanupError;
    };
  }, [iframeRef, targetOrigin, register]);
};
