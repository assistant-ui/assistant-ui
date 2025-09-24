// Inject script - runs in page context
// This script creates an ExtensionHost instance to bridge DevTools with the page

import { ExtensionHost } from "@assistant-ui/react-devtools";

(function () {
  let extensionHost: ExtensionHost | undefined;

  // Function to check for assistant-ui and initialize ExtensionHost
  const initializeExtensionHost = () => {
    // Check if assistant-ui DevTools hook exists
    const hook = window.__ASSISTANT_UI_DEVTOOLS_HOOK__;

    if (hook && !extensionHost) {
      console.log(
        "[assistant-ui DevTools] Detected assistant-ui, initializing ExtensionHost",
      );
      console.log("[assistant-ui DevTools] APIs found:", hook.apis?.size || 0);

      // Create ExtensionHost instance
      extensionHost = new ExtensionHost();
      console.log("[assistant-ui DevTools] ExtensionHost created successfully");
    }
  };

  // Check immediately
  initializeExtensionHost();

  // Check when DOM is ready (for late-loading apps)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeExtensionHost);
  }

  // Periodically check for late initialization (SPA apps)
  let checkCount = 0;
  const checkInterval = setInterval(() => {
    checkCount++;
    initializeExtensionHost();

    // Stop checking after 10 seconds or if host is initialized
    if (checkCount > 20 || extensionHost) {
      clearInterval(checkInterval);
    }
  }, 500);
})();
