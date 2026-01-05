import type { OpenAIGlobals } from "../types";

export interface IframeHtmlOptions {
  widgetBundle: string;
  cssBundle?: string;
  initialGlobals: OpenAIGlobals;
  useTailwindCdn?: boolean;
}

const BRIDGE_SCRIPT = `
(function() {
  const DEFAULT_GLOBALS = {
    theme: "light",
    locale: "en-US",
    displayMode: "inline",
    maxHeight: 600,
    toolInput: {},
    toolOutput: null,
    toolResponseMetadata: null,
    widgetState: null,
    userAgent: {
      device: { type: "desktop" },
      capabilities: { hover: true, touch: false },
    },
    safeArea: {
      insets: { top: 0, bottom: 0, left: 0, right: 0 },
    },
    view: null,
    userLocation: null,
  };

  const pendingCalls = new Map();
  let globals = { ...DEFAULT_GLOBALS };
  let previousGlobals = null;

  function generateCallId() {
    return Date.now() + "-" + Math.random().toString(36).slice(2, 11);
  }

  function dispatchGlobalsChange(changedGlobals) {
    const event = new CustomEvent("openai:set_globals", {
      detail: { globals: changedGlobals },
    });
    window.dispatchEvent(event);
  }

  function buildChangedGlobals(prev, next) {
    if (!prev) return next;
    const changed = {};
    Object.keys(next).forEach(function(key) {
      const prevVal = JSON.stringify(prev[key]);
      const nextVal = JSON.stringify(next[key]);
      if (prevVal !== nextVal) {
        changed[key] = next[key];
      }
    });
    return changed;
  }

  function updateThemeClass(theme) {
    var root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }

  function handleMessage(event) {
    const message = event.data;
    if (!message || typeof message !== "object" || !message.type) return;

    switch (message.type) {
      case "OPENAI_SET_GLOBALS":
        previousGlobals = globals;
        globals = { ...DEFAULT_GLOBALS, ...message.globals };
        const changed = buildChangedGlobals(previousGlobals, globals);
        if (Object.keys(changed).length > 0) {
          if (changed.theme) {
            updateThemeClass(changed.theme);
          }
          dispatchGlobalsChange(changed);
        }
        break;

      case "OPENAI_METHOD_RESPONSE":
        const pending = pendingCalls.get(message.id);
        if (pending) {
          if (message.error) {
            pending.reject(new Error(message.error));
          } else {
            pending.resolve(message.result);
          }
          pendingCalls.delete(message.id);
        }
        break;
    }
  }

  function callMethod(method, args) {
    return new Promise(function(resolve, reject) {
      const id = generateCallId();
      pendingCalls.set(id, { resolve: resolve, reject: reject });

      window.parent.postMessage({
        type: "OPENAI_METHOD_CALL",
        id: id,
        method: method,
        args: args,
      }, "*");
    });
  }

  window.addEventListener("message", handleMessage);

  var api = {
    callTool: function(name, args) {
      return callMethod("callTool", [name, args]);
    },
    requestClose: function() {
      callMethod("requestClose", []);
    },
    sendFollowUpMessage: function(args) {
      return callMethod("sendFollowUpMessage", [args]);
    },
    openExternal: function(payload) {
      callMethod("openExternal", [payload]);
    },
    requestDisplayMode: function(args) {
      return callMethod("requestDisplayMode", [args]);
    },
    setWidgetState: function(state) {
      callMethod("setWidgetState", [state]);
    },
    notifyIntrinsicHeight: function(height) {
      callMethod("notifyIntrinsicHeight", [height]);
    },
    requestModal: function(options) {
      return callMethod("requestModal", [options]);
    },
    uploadFile: function(file) {
      return callMethod("uploadFile", [file]);
    },
    getFileDownloadUrl: function(args) {
      return callMethod("getFileDownloadUrl", [args]);
    },
  };

  Object.defineProperty(window, "openai", {
    value: Object.assign(
      Object.create(null, {
        theme: { get: function() { return globals.theme; }, enumerable: true },
        locale: { get: function() { return globals.locale; }, enumerable: true },
        displayMode: { get: function() { return globals.displayMode; }, enumerable: true },
        maxHeight: { get: function() { return globals.maxHeight; }, enumerable: true },
        toolInput: { get: function() { return globals.toolInput; }, enumerable: true },
        toolOutput: { get: function() { return globals.toolOutput; }, enumerable: true },
        toolResponseMetadata: { get: function() { return globals.toolResponseMetadata; }, enumerable: true },
        widgetState: { get: function() { return globals.widgetState; }, enumerable: true },
        userAgent: { get: function() { return globals.userAgent; }, enumerable: true },
        safeArea: { get: function() { return globals.safeArea; }, enumerable: true },
        view: { get: function() { return globals.view; }, enumerable: true },
        userLocation: { get: function() { return globals.userLocation; }, enumerable: true },
      }),
      api
    ),
    configurable: false,
    writable: false,
  });

  // Expose initialization function for initial globals
  window.__initOpenAIGlobals = function(initialGlobals) {
    previousGlobals = globals;
    globals = { ...DEFAULT_GLOBALS, ...initialGlobals };
    const changed = buildChangedGlobals(previousGlobals, globals);
    if (Object.keys(changed).length > 0) {
      dispatchGlobalsChange(changed);
    }
  };
})();
`;

const TAILWIND_CDN_SCRIPT = `<script src="https://cdn.tailwindcss.com"></script>
<script>
  tailwind.config = {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          border: 'hsl(var(--border))',
          input: 'hsl(var(--input))',
          ring: 'hsl(var(--ring))',
          background: 'hsl(var(--background))',
          foreground: 'hsl(var(--foreground))',
          primary: {
            DEFAULT: 'hsl(var(--primary))',
            foreground: 'hsl(var(--primary-foreground))',
          },
          secondary: {
            DEFAULT: 'hsl(var(--secondary))',
            foreground: 'hsl(var(--secondary-foreground))',
          },
          destructive: {
            DEFAULT: 'hsl(var(--destructive))',
            foreground: 'hsl(var(--destructive-foreground))',
          },
          muted: {
            DEFAULT: 'hsl(var(--muted))',
            foreground: 'hsl(var(--muted-foreground))',
          },
          accent: {
            DEFAULT: 'hsl(var(--accent))',
            foreground: 'hsl(var(--accent-foreground))',
          },
          popover: {
            DEFAULT: 'hsl(var(--popover))',
            foreground: 'hsl(var(--popover-foreground))',
          },
          card: {
            DEFAULT: 'hsl(var(--card))',
            foreground: 'hsl(var(--card-foreground))',
          },
        },
        borderRadius: {
          lg: 'var(--radius)',
          md: 'calc(var(--radius) - 2px)',
          sm: 'calc(var(--radius) - 4px)',
        },
      },
    },
  }
</script>`;

const CSS_VARIABLES = `
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --card: 0 0% 100%;
  --card-foreground: 240 10% 3.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --secondary: 240 4.8% 95.9%;
  --secondary-foreground: 240 5.9% 10%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --accent: 240 4.8% 95.9%;
  --accent-foreground: 240 5.9% 10%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 5.9% 90%;
  --input: 240 5.9% 90%;
  --ring: 240 5.9% 10%;
  --radius: 0.5rem;
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --card: 240 10% 3.9%;
  --card-foreground: 0 0% 98%;
  --popover: 240 10% 3.9%;
  --popover-foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --secondary: 240 3.7% 15.9%;
  --secondary-foreground: 0 0% 98%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --accent: 240 3.7% 15.9%;
  --accent-foreground: 0 0% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 0 0% 98%;
  --border: 240 3.7% 15.9%;
  --input: 240 3.7% 15.9%;
  --ring: 240 4.9% 83.9%;
}

*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}

#root {
  min-height: 100vh;
}
`;

export function generateIframeHtml(options: IframeHtmlOptions): string {
  const {
    widgetBundle,
    cssBundle,
    initialGlobals,
    useTailwindCdn = true,
  } = options;

  const themeClass = initialGlobals.theme === "dark" ? "dark" : "";
  const initScript = `window.__initOpenAIGlobals(${JSON.stringify(initialGlobals)});`;

  return `<!DOCTYPE html>
<html lang="${initialGlobals.locale}" class="${themeClass}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Widget Preview</title>
  ${useTailwindCdn ? TAILWIND_CDN_SCRIPT : ""}
  <style>${CSS_VARIABLES}</style>
  ${cssBundle ? `<style>${cssBundle}</style>` : ""}
</head>
<body>
  <div id="root"></div>
  <script>${BRIDGE_SCRIPT}</script>
  <script>${initScript}</script>
  <script type="module">${widgetBundle}</script>
</body>
</html>`;
}

export function generateEmptyIframeHtml(
  initialGlobals: OpenAIGlobals,
  useTailwindCdn = true,
): string {
  const themeClass = initialGlobals.theme === "dark" ? "dark" : "";
  const initScript = `window.__initOpenAIGlobals(${JSON.stringify(initialGlobals)});`;

  return `<!DOCTYPE html>
<html lang="${initialGlobals.locale}" class="${themeClass}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Widget Preview</title>
  ${useTailwindCdn ? TAILWIND_CDN_SCRIPT : ""}
  <style>${CSS_VARIABLES}</style>
</head>
<body>
  <div id="root">
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; color: hsl(var(--muted-foreground));">
      Loading widget...
    </div>
  </div>
  <script>${BRIDGE_SCRIPT}</script>
  <script>${initScript}</script>
</body>
</html>`;
}
