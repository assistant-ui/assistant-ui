import type { AUIGlobals } from "../types/protocol";

export const DEFAULT_GLOBALS: AUIGlobals = {
  theme: "light",
  locale: "en-US",
  displayMode: "inline",
  previousDisplayMode: null,
  maxHeight: 800,
  toolInput: {},
  toolOutput: null,
  widgetState: null,
  userAgent: {
    device: { type: "desktop" },
    capabilities: { hover: true, touch: false },
  },
  safeArea: {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  },
  userLocation: null,
  toolResponseMetadata: null,
  view: null,
};

export function generateBridgeScript(): string {
  return `
(function() {
  var DEFAULT_GLOBALS = ${JSON.stringify(DEFAULT_GLOBALS)};

  var pendingCalls = new Map();
  var globals = Object.assign({}, DEFAULT_GLOBALS);
  var previousGlobals = null;

  function generateCallId() {
    return Date.now() + "-" + Math.random().toString(36).slice(2, 11);
  }

  function dispatchGlobalsChange(changedGlobals) {
    // Dispatch AUI event (our standard)
    var auiEvent = new CustomEvent("aui:set_globals", {
      detail: { globals: changedGlobals },
    });
    window.dispatchEvent(auiEvent);
    
    // Dispatch OpenAI event (ChatGPT Apps compatibility)
    var openaiEvent = new CustomEvent("openai:set_globals", {
      detail: { globals: changedGlobals },
    });
    window.dispatchEvent(openaiEvent);
  }

  function buildChangedGlobals(prev, next) {
    if (!prev) return next;
    var changed = {};
    Object.keys(next).forEach(function(key) {
      var prevVal = JSON.stringify(prev[key]);
      var nextVal = JSON.stringify(next[key]);
      if (prevVal !== nextVal) {
        changed[key] = next[key];
      }
    });
    return changed;
  }

  function handleMessage(event) {
    if (event.source !== window.parent) return;
    
    var message = event.data;
    if (!message || typeof message !== "object" || !message.type) return;

    // Normalize OPENAI_ prefix to AUI_ for consistent handling
    var type = message.type;
    if (type === "OPENAI_SET_GLOBALS") {
      type = "AUI_SET_GLOBALS";
    } else if (type === "OPENAI_METHOD_RESPONSE") {
      type = "AUI_METHOD_RESPONSE";
    }

    switch (type) {
      case "AUI_SET_GLOBALS":
        previousGlobals = globals;
        
        // Track previousDisplayMode when displayMode changes
        var newGlobals = Object.assign({}, DEFAULT_GLOBALS, message.globals);
        if (previousGlobals && newGlobals.displayMode !== previousGlobals.displayMode) {
          newGlobals.previousDisplayMode = previousGlobals.displayMode;
        }
        
        globals = newGlobals;
        var changed = buildChangedGlobals(previousGlobals, globals);
        if (Object.keys(changed).length > 0) {
          dispatchGlobalsChange(changed);
        }
        break;

      case "AUI_METHOD_RESPONSE":
        var pending = pendingCalls.get(message.id);
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
      var id = generateCallId();
      pendingCalls.set(id, { resolve: resolve, reject: reject });

      window.parent.postMessage({
        type: "AUI_METHOD_CALL",
        id: id,
        method: method,
        args: args,
      }, "*");

      setTimeout(function() {
        var p = pendingCalls.get(id);
        if (p) {
          p.reject(new Error("Method call timed out: " + method));
          pendingCalls.delete(id);
        }
      }, 30000);
    });
  }

  window.addEventListener("message", handleMessage);

  var api = {
    callTool: function(name, args) {
      return callMethod("callTool", [name, args]);
    },
    setWidgetState: function(state) {
      return callMethod("setWidgetState", [state]);
    },
    sendFollowUpMessage: function(args) {
      return callMethod("sendFollowUpMessage", [args]);
    },
    requestDisplayMode: function(args) {
      return callMethod("requestDisplayMode", [args]);
    },
    requestModal: function(options) {
      return callMethod("requestModal", [options]);
    },
    requestClose: function() {
      return callMethod("requestClose", []);
    },
    openExternal: function(payload) {
      return callMethod("openExternal", [payload]);
    },
    notifyIntrinsicHeight: function(height) {
      return callMethod("notifyIntrinsicHeight", [height]);
    },
    uploadFile: function(file) {
      return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function() {
          var base64 = reader.result.toString().split(',')[1];
          callMethod("uploadFile", [{
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64
          }]).then(resolve).catch(reject);
        };
        reader.onerror = function() {
          reject(new Error("Failed to read file"));
        };
        reader.readAsDataURL(file);
      });
    },
    getFileDownloadUrl: function(args) {
      return callMethod("getFileDownloadUrl", [args]);
    },
  };

  Object.defineProperty(window, "aui", {
    value: Object.assign(
      Object.create(null, {
        theme: { get: function() { return globals.theme; }, enumerable: true },
        locale: { get: function() { return globals.locale; }, enumerable: true },
        displayMode: { get: function() { return globals.displayMode; }, enumerable: true },
        previousDisplayMode: { get: function() { return globals.previousDisplayMode; }, enumerable: true },
        maxHeight: { get: function() { return globals.maxHeight; }, enumerable: true },
        toolInput: { get: function() { return globals.toolInput; }, enumerable: true },
        toolOutput: { get: function() { return globals.toolOutput; }, enumerable: true },
        widgetState: { get: function() { return globals.widgetState; }, enumerable: true },
        userAgent: { get: function() { return globals.userAgent; }, enumerable: true },
        safeArea: { get: function() { return globals.safeArea; }, enumerable: true },
        userLocation: { get: function() { return globals.userLocation; }, enumerable: true },
        toolResponseMetadata: { get: function() { return globals.toolResponseMetadata; }, enumerable: true },
        view: { get: function() { return globals.view; }, enumerable: true },
      }),
      api
    ),
    configurable: false,
    writable: false,
  });

  // OpenAI namespace compatibility - alias to window.aui
  Object.defineProperty(window, "openai", {
    value: window.aui,
    configurable: false,
    writable: false,
  });

  window.__initAUIGlobals = function(initialGlobals) {
    previousGlobals = globals;
    globals = Object.assign({}, DEFAULT_GLOBALS, initialGlobals);
    var changed = buildChangedGlobals(previousGlobals, globals);
    if (Object.keys(changed).length > 0) {
      dispatchGlobalsChange(changed);
    }
  };

  window.parent.postMessage({ type: "ready" }, "*");
})();
`;
}
