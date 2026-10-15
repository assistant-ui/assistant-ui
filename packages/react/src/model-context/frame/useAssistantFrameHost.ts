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
    let active:
      | {
          iframe: HTMLIFrameElement;
          window: Window;
          dispose: () => void;
        }
      | undefined;

    const syncFrame = () => {
      const iframe = iframeRef.current;
      const iframeWindow =
        iframe?.isConnected === false ? null : iframe?.contentWindow;
      if (active && active.iframe === iframe && active.window === iframeWindow)
        return;

      const previous = active;
      active = undefined;
      let disposalFailed = false;
      let disposalError: unknown;
      try {
        previous?.dispose();
      } catch (error) {
        disposalFailed = true;
        disposalError = error;
      }

      if (iframe && iframeWindow) {
        const frameHost = new AssistantFrameHost(iframeWindow, targetOrigin);
        let unsubscribe: Unsubscribe;
        try {
          unsubscribe = register(frameHost);
        } catch (error) {
          frameHost.dispose();
          throw error;
        }
        active = {
          iframe,
          window: iframeWindow,
          dispose: () => {
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
          },
        };
      }

      if (disposalFailed) throw disposalError;
    };

    syncFrame();
    const observer = new MutationObserver(syncFrame);
    observer.observe(document, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      active?.dispose();
    };
  }, [iframeRef, targetOrigin, register]);
};
