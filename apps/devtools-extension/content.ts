// Content script - runs in isolated context
// Bridges communication between the page (inject script) and the extension (background/devtools)

(function () {
  console.log("[assistant-ui DevTools] Content script loaded");

  // Inject the inject.js script into the page context
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("inject.js");
  script.onload = function () {
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);

  // Listen for messages from the page (inject script / ExtensionHost)
  window.addEventListener("message", (event) => {
    // Only accept messages from the same window
    if (event.source !== window) return;

    // Handle messages from ExtensionHost (forwarding to DevTools)
    if (event.data.source === "assistant-ui-devtools-page") {
      // Forward to background/devtools
      chrome.runtime
        .sendMessage({
          type: "FROM_PAGE",
          payload: event.data.payload,
        })
        .catch((error) => {
          // DevTools might not be open yet, ignore error
          console.debug("[assistant-ui DevTools] DevTools not ready:", error);
        });
    }
  });

  // Listen for messages from background/devtools to forward to the page
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "TO_PAGE") {
      // Forward to page (ExtensionHost)
      // The payload is the actual message from the iframe
      window.postMessage(
        {
          source: "assistant-ui-devtools-iframe",
          payload: message.payload,
        },
        "*",
      );
      sendResponse({ success: true });
    }
    return true; // Keep message channel open for async response
  });

  console.log("[assistant-ui DevTools] Content script initialized");
})();
