// Background service worker
// Routes messages between content scripts and devtools panels

interface TabConnection {
  port: chrome.runtime.Port;
}

// Track connections from devtools panels (keyed by tab ID)
const devtoolsConnections = new Map<number, TabConnection>();

// Listen for connections from devtools panels
chrome.runtime.onConnect.addListener((port) => {
  console.log("[assistant-ui DevTools] Port connected:", port.name);

  if (port.name.startsWith("devtools-panel-")) {
    // Extract tab ID from port name (format: "devtools-panel-123")
    const tabId = parseInt(port.name.replace("devtools-panel-", ""), 10);

    if (!Number.isNaN(tabId)) {
      console.log(
        `[assistant-ui DevTools] DevTools panel connected for tab ${tabId}`,
      );

      // Store the connection
      devtoolsConnections.set(tabId, {
        port,
      });

      // Handle messages from devtools panel to forward to content script
      port.onMessage.addListener((message) => {
        console.log(
          `[assistant-ui DevTools] Message from panel for tab ${tabId}:`,
          message,
        );

        // Forward to content script
        // The panel sends the actual message directly, we just forward it
        chrome.tabs
          .sendMessage(tabId, {
            type: "TO_PAGE",
            payload: message,
          })
          .catch((error) => {
            console.error(
              `[assistant-ui DevTools] Failed to send to tab ${tabId}:`,
              error,
            );
          });
      });

      // Clean up on disconnect
      port.onDisconnect.addListener(() => {
        console.log(
          `[assistant-ui DevTools] DevTools panel disconnected for tab ${tabId}`,
        );
        devtoolsConnections.delete(tabId);
      });
    }
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (!tabId) {
    console.warn("[assistant-ui DevTools] Message from unknown tab");
    return;
  }

  console.log(
    `[assistant-ui DevTools] Message from tab ${tabId}:`,
    message.type,
  );

  switch (message.type) {
    case "FROM_PAGE":
      // Forward message from page to devtools panel
      const devtoolsConnection = devtoolsConnections.get(tabId);
      if (devtoolsConnection) {
        console.log(
          `[assistant-ui DevTools] Forwarding to panel for tab ${tabId}`,
        );
        devtoolsConnection.port.postMessage(message.payload);
      } else {
        console.debug(`[assistant-ui DevTools] No panel open for tab ${tabId}`);
      }

      sendResponse({ success: true });
      break;

    default:
      console.debug(
        "[assistant-ui DevTools] Unknown message type:",
        message.type,
      );
  }

  return true; // Keep message channel open
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  devtoolsConnections.delete(tabId);
});

console.log("[assistant-ui DevTools] Background service worker initialized");
