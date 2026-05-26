import { minimalImportMap } from "./defaultImportMap";

export interface BuildReactArtifactHtmlOptions {
  /**
   * Import map injected into the iframe document. Defaults to
   * {@link minimalImportMap}. Pass {@link claudeParityImportMap} (or a custom
   * map) to widen the set of libraries the model can `import`.
   */
  importMap?: Record<string, string>;
  /**
   * Load the Tailwind Play CDN inside the iframe so model-authored components
   * pick up Tailwind utility classes. Default: `true`. Set `false` if you
   * supply your own CSS.
   */
  tailwind?: boolean;
  /** CSS classes applied to the iframe's `<body>`. */
  bodyClassName?: string;
  /**
   * URL of `@babel/standalone`. Must be the IIFE bundle (NOT an ES module),
   * because it's loaded via a classic `<script>` tag and registers a global
   * `Babel`. Override to pin a different version or host. Default: unpkg.
   */
  babelUrl?: string;
  /**
   * URL of the Tailwind Play CDN script. Override to pin a version or host.
   */
  tailwindCdnUrl?: string;
}

// `@babel/standalone` is a UMD/IIFE bundle that registers a global `Babel`.
// We must NOT use esm.sh here — it serves the package as an ES module which
// fails when loaded via a non-module <script> tag (`Unexpected token 'export'`).
// unpkg/jsdelivr serve the original IIFE bundle.
const DEFAULT_BABEL_URL =
  "https://unpkg.com/@babel/standalone@7.25.7/babel.min.js";
const DEFAULT_TAILWIND_URL = "https://cdn.tailwindcss.com";

/**
 * Wrap a user-authored single-file React component (TSX/JSX with `export
 * default`) into a complete HTML document suitable for
 * `SafeContentFrame.renderHtml`.
 *
 * The generated document:
 *
 *   1. Loads an `<script type="importmap">` (default: {@link minimalImportMap}).
 *   2. Loads `@babel/standalone` from a CDN.
 *   3. Optionally loads the Tailwind Play CDN.
 *   4. Stashes the user source verbatim in a `<script type="text/plain">` block
 *      (so the browser does NOT execute it as JS).
 *   5. Runs a bootstrap module script that compiles the user source via Babel,
 *      blob-URL-imports the compiled module, reads its default export, and
 *      mounts it into `<div id="root">`.
 *
 * Any compile or runtime error is rendered inline as a `<pre>` overlay.
 */
export function buildReactArtifactHtml(
  source: string,
  opts: BuildReactArtifactHtmlOptions = {},
): string {
  const importMap = opts.importMap ?? minimalImportMap;
  const tailwind = opts.tailwind ?? true;
  const babelUrl = opts.babelUrl ?? DEFAULT_BABEL_URL;
  const tailwindUrl = opts.tailwindCdnUrl ?? DEFAULT_TAILWIND_URL;
  const bodyClass = opts.bodyClassName ?? "";

  // The user source lives inside a <script type="text/plain"> block whose
  // textContent we read from the bootstrap. The block ends at the first
  // literal `</script>` in the page parser, so we must escape that sequence.
  const userSource = source.replace(/<\/script>/gi, "<\\/script>");
  const importMapJson = JSON.stringify({ imports: importMap });

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>React artifact</title>
    ${tailwind ? `<script src="${escapeAttr(tailwindUrl)}"></script>` : ""}
    <script type="importmap">${importMapJson}</script>
    <script src="${escapeAttr(babelUrl)}"></script>
    <style>
      html, body { height: 100%; margin: 0; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
      #aui-error {
        position: fixed; inset: 0; padding: 1rem; margin: 0;
        font: 13px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
        color: #b91c1c; background: #fef2f2;
        white-space: pre-wrap; word-break: break-word;
        overflow: auto; z-index: 2147483647;
      }
    </style>
  </head>
  <body class="${escapeAttr(bodyClass)}">
    <div id="root"></div>
    <script type="text/plain" id="aui-react-source">${userSource}</script>
    <script type="module">
      const sourceEl = document.getElementById("aui-react-source");
      const source = sourceEl ? sourceEl.textContent || "" : "";

      // The host origin is needed as the postMessage targetOrigin (never "*",
      // to preserve isolation). SafeContentFrame forwards it via the shim's
      // ?origin=... query string, but when the shim serves this document from
      // a blob: URL the query string is lost. We therefore also fall back to
      // location.ancestorOrigins[0] (the host origin survives the blob
      // navigation in Chromium/WebKit). When neither is available (e.g.
      // Firefox), the host handshake in Phase 2 supplies it.
      function resolveParentOrigin() {
        try {
          const q = new URLSearchParams(location.search).get("origin");
          if (q) return q;
        } catch (_) {}
        try {
          const ao = location.ancestorOrigins;
          if (ao && ao.length > 0 && ao[0] && ao[0] !== "null") return ao[0];
        } catch (_) {}
        return "";
      }
      let parentOrigin = resolveParentOrigin();

      let statusReported = false;
      let bufferedStatusPayload = null;
      function postStatus(payload) {
        try {
          if (window.parent && parentOrigin) {
            window.parent.postMessage(
              { type: "aui:artifact:status", ...payload },
              parentOrigin,
            );
            return true;
          }
        } catch (_) {}
        return false;
      }
      function reportStatus(payload) {
        if (statusReported) return;
        statusReported = true;
        if (!postStatus(payload)) {
          // Origin not yet known (e.g. blob: document without ancestorOrigins).
          // Stash and flush when the host handshake supplies the origin.
          bufferedStatusPayload = payload;
        }
      }

      // Host handshake: SafeContentFrame's RenderedFrame.origin lets the host
      // postMessage into this frame with a concrete targetOrigin. The message's
      // event.origin IS the host origin, which we adopt as our postMessage
      // target when no other source was available. Registered synchronously so
      // it is live before the host's first hello.
      window.addEventListener("message", (e) => {
        if (!e || !e.data || e.data.type !== "aui:artifact:hello") return;
        if (e.source !== window.parent) return;
        if (parentOrigin) return; // already resolved synchronously
        if (!e.origin || e.origin === "null") return;
        parentOrigin = e.origin;
        if (bufferedStatusPayload) {
          const payload = bufferedStatusPayload;
          bufferedStatusPayload = null;
          postStatus(payload);
        }
      });

      function serializeError(err) {
        if (!err) return { message: "Unknown error" };
        if (typeof err === "string") return { message: err };
        return {
          message: err.message || String(err),
          stack: err.stack || undefined,
          name: err.name || undefined,
        };
      }

      function showError(err) {
        const pre = document.getElementById("aui-error") || document.createElement("pre");
        pre.id = "aui-error";
        pre.textContent = (err && (err.stack || err.message)) || String(err);
        if (!pre.parentNode) document.body.appendChild(pre);
        try { console.error("[aui-react-artifact]", err); } catch (_) {}
        reportStatus({ ok: false, error: serializeError(err) });
      }

      // Benign warnings we deliberately ignore so they do not cover the
      // rendered component with the error overlay or trip the feedback loop.
      function isBenignError(msg) {
        if (!msg) return false;
        return (
          msg.indexOf("ResizeObserver loop") !== -1 ||
          msg.indexOf("Non-Error promise rejection captured") !== -1
        );
      }

      window.addEventListener("error", (e) => {
        if (isBenignError(e.message)) return;
        showError(e.error || new Error(e.message + " @ " + e.filename + ":" + e.lineno));
      });
      window.addEventListener("unhandledrejection", (e) => {
        const reason = e.reason;
        const msg = reason && (reason.message || String(reason));
        if (isBenignError(msg)) return;
        showError(reason || new Error("Unhandled rejection"));
      });

      try {
        if (typeof Babel === "undefined") {
          throw new Error("Babel standalone failed to load from " + ${JSON.stringify(babelUrl)});
        }
        const compiled = Babel.transform(source, {
          filename: "artifact.tsx",
          presets: [
            ["env", { modules: false, targets: { esmodules: true } }],
            // automatic runtime auto-inserts: import { jsx } from "react/jsx-runtime";
            // so the user source does not need to import React. The importmap
            // covers react/jsx-runtime so module resolution works.
            ["react", { runtime: "automatic" }],
            "typescript",
          ],
        }).code;

        const blob = new Blob([compiled], { type: "text/javascript" });
        const url = URL.createObjectURL(blob);
        let mod;
        try {
          mod = await import(url);
        } finally {
          URL.revokeObjectURL(url);
        }

        const App = mod.default;
        if (typeof App !== "function") {
          throw new Error(
            "React artifact must \`export default\` a component function or class. Got: " + typeof App,
          );
        }

        const [{ default: React }, { createRoot }] = await Promise.all([
          import("react"),
          import("react-dom/client"),
        ]);

        // Authoritative success/failure signal for the artifact mount.
        //
        // React 18 renders concurrently, so a render-time throw in the user
        // component surfaces *after* the synchronous root.render() call
        // returns. A plain try/catch around render() (or a deferred rAF
        // success report) therefore misses it: success would be declared
        // before React ever threw. Instead we wrap the component in an error
        // boundary — render / lifecycle / effect throws below it are routed to
        // componentDidCatch and reported as a failed status. Success is
        // reported from an effect that only commits when the subtree rendered
        // cleanly: if the component throws during render, the probe never
        // mounts; if it throws in an effect, the probe's effect (a later
        // sibling) is skipped when React unwinds the failed flush. Either way
        // we never falsely report ok:true. The one-shot guard in reportStatus
        // makes whichever fires first authoritative.
        class ArtifactErrorBoundary extends React.Component {
          constructor(props) {
            super(props);
            this.state = { hasError: false };
          }
          static getDerivedStateFromError() {
            return { hasError: true };
          }
          componentDidCatch(error) {
            showError(error);
          }
          render() {
            return this.state.hasError ? null : this.props.children;
          }
        }

        function SuccessProbe() {
          React.useEffect(() => {
            reportStatus({ ok: true });
          }, []);
          return null;
        }

        const root = createRoot(document.getElementById("root"));
        root.render(
          React.createElement(
            ArtifactErrorBoundary,
            null,
            React.createElement(App),
            React.createElement(SuccessProbe),
          ),
        );
      } catch (err) {
        showError(err);
      }
    </script>
  </body>
</html>`;
}

function escapeAttr(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
