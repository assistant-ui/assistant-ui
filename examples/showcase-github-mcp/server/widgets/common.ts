/**
 * Shared `<script>` snippet that hooks into the MCP App bridge to receive
 * the tool result and call a per-widget `render(result)` function.
 */
export const BRIDGE_BOOTSTRAP = /* html */ `
<script>
  (() => {
    const log = (...a) => console.log("[mcp-widget]", ...a);

    function emit(method, params) {
      parent.postMessage({ jsonrpc: "2.0", method, params: params ?? {} }, "*");
    }

    function init() {
      emit("notifications/initialized");
      const h = document.documentElement.scrollHeight;
      emit("notifications/size_changed", { height: h });
    }

    function handleResult(result) {
      try {
        if (typeof window.render === "function") window.render(result);
      } catch (err) {
        log("render error", err);
        emit("notifications/error", { message: String(err) });
      } finally {
        const h = document.documentElement.scrollHeight;
        emit("notifications/size_changed", { height: h });
      }
    }

    window.addEventListener("message", (ev) => {
      const msg = ev.data;
      if (!msg || msg.jsonrpc !== "2.0") return;
      if (msg.method === "notifications/tools/call/result") {
        handleResult(msg.params?.result);
      }
    });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  })();
</script>
`;

export const COMMON_CSS = /* css */ `
  :root { color-scheme: light dark; }
  body {
    font: 13px/1.4 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    margin: 0;
    padding: 12px;
    color: #111;
    background: #fff;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #eee; background: #0d1117; }
  }
  h2 { font-size: 14px; margin: 0 0 8px; font-weight: 600; }
  .muted { color: #888; font-size: 12px; }
`;
