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
   * because it is loaded via a classic `<script>` tag and registers a global
   * `Babel`. Override to pin a different version or host. Default: unpkg.
   */
  babelUrl?: string;
  /** URL of the Tailwind Play CDN script. Override to pin a version or host. */
  tailwindCdnUrl?: string;
}

// `@babel/standalone` is a UMD/IIFE bundle that registers a global `Babel`. It
// must not be served as an ES module (esm.sh) here because it is loaded via a
// non-module <script> tag; unpkg/jsdelivr serve the original IIFE bundle.
const DEFAULT_BABEL_URL =
  "https://unpkg.com/@babel/standalone@7.25.7/babel.min.js";
const DEFAULT_TAILWIND_URL = "https://cdn.tailwindcss.com";

/**
 * Wrap a model-authored single-file React component (TSX/JSX with an
 * `export default`) into a complete HTML document for
 * `SafeContentFrame.renderHtml`.
 *
 * The document loads an import map and `@babel/standalone` from a CDN
 * (Babel runs inside the sandboxed iframe, so it never enters the host
 * bundle), stashes the source in a `<script type="text/plain">` block,
 * compiles it, blob-URL-imports the compiled module, and mounts its default
 * export into `#root`. It reports its outcome to the host by posting an
 * `aui-artifact:status` message ({@link reportStatus}: `{ ok }` on a clean
 * mount, `{ ok: false, error }` on a compile/runtime error) and its content
 * height via `aui-artifact:size`. Both post to `"*"`; the host's
 * SandboxHost validates the source/origin on receipt.
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

  // The source lives in a <script type="text/plain"> block; the parser ends
  // that element at the first literal `</script` token, so escape the prefix.
  const userSource = source.replace(/<\/script/gi, "<\\/script");
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
      function post(message) {
        try { window.parent.postMessage(message, "*"); } catch (_) {}
      }

      function reportSize() {
        post({ type: "aui-artifact:size", height: Math.ceil(document.documentElement.scrollHeight) });
      }
      if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(reportSize).observe(document.documentElement);
      }
      addEventListener("load", reportSize);

      let statusReported = false;
      function reportStatus(payload) {
        if (statusReported) return;
        statusReported = true;
        post({ type: "aui-artifact:status", ...payload });
      }

      function serializeError(err) {
        if (!err) return { message: "Unknown error" };
        if (typeof err === "string") return { message: err };
        return { message: err.message || String(err), stack: err.stack || undefined, name: err.name || undefined };
      }

      function showError(err) {
        const pre = document.getElementById("aui-error") || document.createElement("pre");
        pre.id = "aui-error";
        pre.textContent = (err && (err.stack || err.message)) || String(err);
        if (!pre.parentNode) document.body.appendChild(pre);
        try { console.error("[aui-react-artifact]", err); } catch (_) {}
        reportStatus({ ok: false, error: serializeError(err) });
      }

      // Benign warnings we ignore so they do not cover the component with the
      // error overlay or trip the feedback loop.
      function isBenignError(msg) {
        if (!msg) return false;
        return msg.indexOf("ResizeObserver loop") !== -1 || msg.indexOf("Non-Error promise rejection captured") !== -1;
      }
      window.addEventListener("error", (e) => {
        if (isBenignError(e.message)) return;
        showError(e.error || new Error(e.message + " @ " + e.filename + ":" + e.lineno));
      });
      window.addEventListener("unhandledrejection", (e) => {
        const reason = e.reason;
        if (isBenignError(reason && (reason.message || String(reason)))) return;
        showError(reason || new Error("Unhandled rejection"));
      });

      const sourceEl = document.getElementById("aui-react-source");
      const source = sourceEl ? sourceEl.textContent || "" : "";

      try {
        if (typeof Babel === "undefined") {
          throw new Error("Babel standalone failed to load from " + ${JSON.stringify(babelUrl)});
        }
        const compiled = Babel.transform(source, {
          filename: "artifact.tsx",
          presets: [
            ["env", { modules: false, targets: { esmodules: true } }],
            ["react", { runtime: "automatic" }],
            "typescript",
          ],
        }).code;

        const blob = new Blob([compiled], { type: "text/javascript" });
        const url = URL.createObjectURL(blob);
        let mod;
        try { mod = await import(url); } finally { URL.revokeObjectURL(url); }

        const App = mod.default;
        if (typeof App !== "function") {
          throw new Error("React artifact must \`export default\` a component function or class. Got: " + typeof App);
        }

        const [{ default: React }, { createRoot }] = await Promise.all([
          import("react"),
          import("react-dom/client"),
        ]);

        // React 18 renders concurrently, so a render-time throw surfaces after
        // root.render() returns. The error boundary routes render/lifecycle
        // throws to a failed status; SuccessProbe reports ok only from an
        // effect that commits when the subtree rendered cleanly. The one-shot
        // guard makes whichever fires first authoritative.
        class ArtifactErrorBoundary extends React.Component {
          constructor(props) { super(props); this.state = { hasError: false }; }
          static getDerivedStateFromError() { return { hasError: true }; }
          componentDidCatch(error) { showError(error); }
          render() { return this.state.hasError ? null : this.props.children; }
        }

        function SuccessProbe() {
          React.useEffect(() => { reportStatus({ ok: true }); }, []);
          return null;
        }

        createRoot(document.getElementById("root")).render(
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
