// DevTools Panel UI
// Displays the iframe and manages communication between the iframe and the page

import React, { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { DEFAULT_FRAME_URL } from "@assistant-ui/react-devtools";

export const DevToolsPanel: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const portRef = useRef<chrome.runtime.Port | null>(null);
  const tabIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Get the inspected tab ID
    const tabId = chrome.devtools.inspectedWindow.tabId;
    tabIdRef.current = tabId;

    console.log(`[assistant-ui DevTools Panel] Initializing for tab ${tabId}`);

    // Connect to background service worker with tab ID
    portRef.current = chrome.runtime.connect({
      name: `devtools-panel-${tabId}`,
    });

    // Handle messages from iframe and forward to background
    const handleIframeMessage = (event: MessageEvent) => {
      // Only accept messages from our iframe
      if (event.source !== iframeRef.current?.contentWindow) return;

      console.log(
        "[assistant-ui DevTools Panel] Message from iframe:",
        event.data,
      );

      // Forward to background (which will forward to content script/page)
      // The iframe sends the actual message payload directly
      if (portRef.current) {
        portRef.current.postMessage(event.data);
      }
    };

    // Handle messages from background (originating from page) and forward to iframe
    const handleBackgroundMessage = (message: any) => {
      console.log(
        "[assistant-ui DevTools Panel] Message from background:",
        message,
      );

      // Forward to iframe
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(message, "*");
      }
    };

    // Set up listeners
    window.addEventListener("message", handleIframeMessage);

    if (portRef.current) {
      portRef.current.onMessage.addListener(handleBackgroundMessage);
    }

    // Cleanup
    return () => {
      window.removeEventListener("message", handleIframeMessage);

      if (portRef.current) {
        portRef.current.disconnect();
        portRef.current = null;
      }
    };
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <iframe
        ref={iframeRef}
        src={DEFAULT_FRAME_URL}
        style={{
          width: "100%",
          flex: 1,
          border: "none",
        }}
        title="assistant-ui DevTools"
      />
    </div>
  );
};

// Initialize the panel when DOM is ready
const init = () => {
  const container = document.getElementById("root");
  if (container) {
    const root = createRoot(container);
    root.render(<DevToolsPanel />);
  } else {
    console.error("[assistant-ui DevTools Panel] Root container not found");
  }
};

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
