import type { OpenAIGlobals } from "./types";

export function generateBridgeScript(initialGlobals: OpenAIGlobals): string {
  const globalsJson = JSON.stringify(initialGlobals);

  return `
(function() {
  'use strict';

  let globals = ${globalsJson};
  const pendingCalls = new Map();
  let callIdCounter = 0;

  function sendMethodCall(method, args) {
    return new Promise((resolve, reject) => {
      const id = String(++callIdCounter);
      pendingCalls.set(id, { resolve, reject });

      window.parent.postMessage({
        type: 'OPENAI_METHOD_CALL',
        id: id,
        method: method,
        args: args
      }, '*');

      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingCalls.has(id)) {
          pendingCalls.delete(id);
          reject(new Error('Method call timed out: ' + method));
        }
      }, 30000);
    });
  }

  window.addEventListener('message', function(event) {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    // Handle globals update from parent
    if (data.type === 'OPENAI_SET_GLOBALS') {
      const newGlobals = data.globals;
      const changedKeys = {};

      // Track which keys changed
      for (const key in newGlobals) {
        if (JSON.stringify(globals[key]) !== JSON.stringify(newGlobals[key])) {
          changedKeys[key] = newGlobals[key];
        }
      }

      // Update globals
      globals = { ...globals, ...newGlobals };

      // Dispatch event if anything changed
      if (Object.keys(changedKeys).length > 0) {
        window.dispatchEvent(new CustomEvent('openai:set_globals', {
          detail: { globals: changedKeys }
        }));
      }
    }

    // Handle method response from parent
    if (data.type === 'OPENAI_METHOD_RESPONSE') {
      const pending = pendingCalls.get(data.id);
      if (pending) {
        pendingCalls.delete(data.id);
        if (data.error) {
          pending.reject(new Error(data.error));
        } else {
          pending.resolve(data.result);
        }
      }
    }
  }, false);

  window.openai = {
    // Read-only globals (via getters)
    get theme() { return globals.theme; },
    get locale() { return globals.locale; },
    get displayMode() { return globals.displayMode; },
    get maxHeight() { return globals.maxHeight; },
    get toolInput() { return globals.toolInput; },
    get toolOutput() { return globals.toolOutput; },
    get toolResponseMetadata() { return globals.toolResponseMetadata; },
    get widgetState() { return globals.widgetState; },
    get userAgent() { return globals.userAgent; },
    get safeArea() { return globals.safeArea; },
    get view() { return globals.view; },
    get userLocation() { return globals.userLocation; },

    // API Methods
    callTool: function(name, args) {
      return sendMethodCall('callTool', [name, args]);
    },

    setWidgetState: function(state) {
      // Update local state immediately
      globals.widgetState = state == null ? null : state;
      // Notify parent (fire-and-forget style, but still logged)
      sendMethodCall('setWidgetState', [state]).catch(function() {});
    },

    requestDisplayMode: function(opts) {
      return sendMethodCall('requestDisplayMode', [opts]);
    },

    sendFollowUpMessage: function(opts) {
      return sendMethodCall('sendFollowUpMessage', [opts]);
    },

    requestClose: function() {
      sendMethodCall('requestClose', []).catch(function() {});
    },

    openExternal: function(opts) {
      sendMethodCall('openExternal', [opts]).catch(function() {});
    },

    notifyIntrinsicHeight: function(height) {
      sendMethodCall('notifyIntrinsicHeight', [height]).catch(function() {});
    },

    requestModal: function(opts) {
      return sendMethodCall('requestModal', [opts]);
    },

    uploadFile: function(file) {
      return sendMethodCall('uploadFile', [file]);
    },

    getFileDownloadUrl: function(opts) {
      return sendMethodCall('getFileDownloadUrl', [opts]);
    }
  };

  // Make it non-configurable to match real ChatGPT behavior
  Object.defineProperty(window, 'openai', {
    configurable: false,
    writable: false
  });

  // Signal that the bridge is ready
  console.log('[Workbench] window.openai bridge initialized');
})();
`;
}

export function generateComponentBundle(
  bridgeScript: string,
  componentHtml: string,
  theme: "light" | "dark" = "light",
): string {
  const themeClass = theme === "dark" ? "dark" : "";

  return `<!DOCTYPE html>
<html lang="en" class="${themeClass}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Workbench Component</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            background: 'hsl(var(--background, 0 0% 100%))',
            foreground: 'hsl(var(--foreground, 222.2 47.4% 11.2%))',
            muted: 'hsl(var(--muted, 210 40% 96.1%))',
            'muted-foreground': 'hsl(var(--muted-foreground, 215.4 16.3% 46.9%))',
            primary: 'hsl(var(--primary, 222.2 47.4% 11.2%))',
            'primary-foreground': 'hsl(var(--primary-foreground, 210 40% 98%))',
          }
        }
      }
    }
  </script>
  <style>
    :root {
      --background: 0 0% 100%;
      --foreground: 222.2 47.4% 11.2%;
      --muted: 210 40% 96.1%;
      --muted-foreground: 215.4 16.3% 46.9%;
      --primary: 222.2 47.4% 11.2%;
      --primary-foreground: 210 40% 98%;
    }
    .dark {
      --background: 224 71% 4%;
      --foreground: 213 31% 91%;
      --muted: 223 47% 11%;
      --muted-foreground: 215.4 16.3% 56.9%;
      --primary: 210 40% 98%;
      --primary-foreground: 222.2 47.4% 1.2%;
    }
    body {
      background-color: hsl(var(--background));
      color: hsl(var(--foreground));
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 16px;
    }
  </style>
  <script>${bridgeScript}</script>
</head>
<body>
  <div id="root">${componentHtml}</div>
</body>
</html>`;
}
