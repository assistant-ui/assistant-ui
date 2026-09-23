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
    const iframe = iframeRef.current;
    const iframeWindow = iframe?.contentWindow;
    if (!iframe || !iframeWindow) return;

    const connect = () => {
      const frameHost = new AssistantFrameHost(iframeWindow, targetOrigin);
      return { frameHost, unsubscribe: register(frameHost) };
    };

    const disconnect = ({
      frameHost,
      unsubscribe,
    }: ReturnType<typeof connect>) => {
      let cleanupFailed = false;
      let cleanupError: unknown;

      try {
        frameHost.dispose();
      } catch (error) {
        cleanupFailed = true;
        cleanupError = error;
      }

      try {
        unsubscribe();
      } catch (error) {
        if (cleanupFailed) {
          console.error(
            "[assistant-ui] AssistantFrameHost unregistration failed.",
            error,
          );
        } else {
          cleanupFailed = true;
          cleanupError = error;
        }
      }

      if (cleanupFailed) throw cleanupError;
    };

    let connection = connect();

    // A navigation replaces the frame's document, and its providers and
    // in-flight tool calls with it, without posting anything to the parent.
    const reconnect = () => {
      const previous = connection;
      connection = connect();
      disconnect(previous);
    };
    iframe.addEventListener("load", reconnect);

    return () => {
      iframe.removeEventListener("load", reconnect);
      disconnect(connection);
    };
  }, [iframeRef, targetOrigin, register]);
};
