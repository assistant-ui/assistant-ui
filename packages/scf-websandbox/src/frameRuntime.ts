export const HELLO_MESSAGE = "websandbox:hello";
export const CONNECT_MESSAGE = "websandbox:connect";

/**
 * The in-frame half of the protocol, shipped as source text so no consumer
 * bundler transform (helper injection, renaming) can reach it. It installs
 * `window.Websandbox`, announces itself to the parent, and speaks the same
 * messages as `HostConnection` over the port the parent hands back.
 */
const FRAME_RUNTIME = `(function (parentOrigin, token) {
  "use strict";
  var port = null;
  var queue = [];
  var callbacks = {};
  var nextId = 0;
  var exposed = {};
  var serviceMethods = {};
  var resolveRemoteMethods;

  function defineOwn(target, key, value) {
    Object.defineProperty(target, key, {
      value: value,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }

  function serializeError(error) {
    var out = {};
    Object.keys(error).forEach(function (key) {
      defineOwn(out, key, error[key]);
    });
    out.name = error.name;
    out.message = error.message;
    return out;
  }

  function deserializeError(value) {
    if (!value || typeof value !== "object" || typeof value.message !== "string") {
      return value;
    }
    var error = new Error(value.message);
    Object.keys(value).forEach(function (key) {
      defineOwn(error, key, value[key]);
    });
    return error;
  }

  function post(message) {
    if (port) port.postMessage(message);
    else queue.push(message);
  }

  function call(build) {
    return new Promise(function (resolve, reject) {
      var callId = String(++nextId);
      callbacks[callId] = { resolve: resolve, reject: reject };
      try {
        post(build(callId));
      } catch (error) {
        delete callbacks[callId];
        reject(error);
      }
    });
  }

  function respond(callId, result, success) {
    if (result instanceof Error) result = serializeError(result);
    var message = { type: "response", callId: callId, success: success, result: result };
    try {
      post(message);
      return;
    } catch (error) {
      if (!error || error.name !== "DataCloneError") return;
    }
    try {
      message.result = JSON.parse(JSON.stringify(result));
    } catch (jsonError) {
      message.success = false;
      message.result = serializeError(new Error("Websandbox: the result could not be cloned"));
    }
    try {
      post(message);
    } catch (finalError) {}
  }

  function answer(callId, table, allowed, methodName, args) {
    new Promise(function (resolve) {
      if (typeof methodName !== "string" || !Object.prototype.hasOwnProperty.call(allowed, methodName)) {
        throw new Error('Websandbox: method "' + String(methodName) + '" is not exposed');
      }
      var method = table[methodName];
      if (typeof method !== "function") {
        throw new Error('Websandbox: "' + methodName + '" is not a function');
      }
      resolve(method.apply(table, Array.isArray(args) ? args : []));
    }).then(
      function (result) { respond(callId, result, true); },
      function (error) { respond(callId, error, false); }
    );
  }

  function keySet(object) {
    var set = Object.create(null);
    Object.keys(object).forEach(function (key) { set[key] = true; });
    return set;
  }

  var connection = {
    remote: {},
    localApi: {},
    remoteMethodsWaitPromise: new Promise(function (resolve) {
      resolveRemoteMethods = resolve;
    }),
    setLocalApi: function (api) {
      connection.localApi = api;
      exposed = keySet(api);
      return call(function (callId) {
        return { type: "set-interface", callId: callId, apiMethods: Object.keys(api) };
      }).then(function () {});
    },
    callRemoteMethod: function (methodName) {
      var args = Array.prototype.slice.call(arguments, 1);
      return call(function (callId) {
        return { type: "message", callId: callId, methodName: methodName, arguments: args };
      });
    },
    callRemoteServiceMethod: function (methodName) {
      var args = Array.prototype.slice.call(arguments, 1);
      return call(function (callId) {
        return { type: "service-message", callId: callId, methodName: methodName, arguments: args };
      });
    }
  };

  function handle(data) {
    if (!data || typeof data !== "object" || typeof data.callId !== "string") return;
    var callId = data.callId;
    if (data.type === "response") {
      var pending = callbacks[callId];
      if (!pending) return;
      delete callbacks[callId];
      if (data.success) pending.resolve(data.result);
      else pending.reject(deserializeError(data.result));
    } else if (data.type === "message") {
      answer(callId, connection.localApi, exposed, data.methodName, data.arguments);
    } else if (data.type === "service-message") {
      answer(callId, serviceMethods, keySet(serviceMethods), data.methodName, data.arguments);
    } else if (data.type === "set-interface") {
      var remote = {};
      (Array.isArray(data.apiMethods) ? data.apiMethods : []).forEach(function (method) {
        if (typeof method !== "string") return;
        defineOwn(remote, method, function () {
          var args = Array.prototype.slice.call(arguments);
          return connection.callRemoteMethod.apply(connection, [method].concat(args));
        });
      });
      connection.remote = remote;
      resolveRemoteMethods();
      respond(callId, undefined, true);
    }
  }

  function head() {
    return document.head || document.getElementsByTagName("head")[0] || document.documentElement;
  }

  var frame = {
    connection: connection,
    runCode: function (code) {
      var script = document.createElement("script");
      script.textContent = code;
      head().appendChild(script);
    },
    importScript: function (url) {
      return new Promise(function (resolve, reject) {
        var script = document.createElement("script");
        script.onload = function () { resolve(); };
        script.onerror = function () {
          reject(new Error("Websandbox: failed to load script " + url));
        };
        script.src = url;
        head().appendChild(script);
      });
    },
    injectStyle: function (style) {
      var element = document.createElement("style");
      element.textContent = style;
      head().appendChild(element);
    },
    importStyle: function (url) {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = url;
      head().appendChild(link);
    }
  };

  serviceMethods = {
    runCode: function (code) { return frame.runCode(code); },
    importScript: function (url) { return frame.importScript(url); },
    injectStyle: function (style) { return frame.injectStyle(style); },
    importStyle: function (url) { return frame.importStyle(url); }
  };

  window.addEventListener("message", function (event) {
    if (port) return;
    if (event.source !== window.parent || event.origin !== parentOrigin) return;
    var data = event.data;
    if (!data || data.type !== "${CONNECT_MESSAGE}" || data.token !== token) return;
    if (!event.ports || !event.ports[0]) return;
    port = event.ports[0];
    port.onmessage = function (portEvent) { handle(portEvent.data); };
    var queued = queue;
    queue = [];
    queued.forEach(function (message) {
      try {
        post(message);
      } catch (error) {
        var pending = callbacks[message.callId];
        delete callbacks[message.callId];
        if (pending) pending.reject(error);
      }
    });
  });

  window.Websandbox = window.Websandbox || frame;
  connection.callRemoteServiceMethod("iframeInitialized");
  window.parent.postMessage({ type: "${HELLO_MESSAGE}", token: token }, parentOrigin);
})`;

/** The inline script that boots the in-frame runtime for one sandbox. */
export function frameRuntimeScript(parentOrigin: string, token: string) {
  const args = JSON.stringify([parentOrigin, token]).replace(/</g, "\\u003c");
  return `${FRAME_RUNTIME}.apply(null, ${args});`;
}
