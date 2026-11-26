"use client";

import { useTheme } from "next-themes";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { SafeContentFrame, type RenderedFrame } from "safe-content-frame";
import { Button } from "@/components/ui/button";

const frame = new SafeContentFrame("safe-content-frame-demo");

const SAMPLE = `<p>This script tries to read the page around it:</p>
<pre id="result"></pre>
<script>
  const result = document.getElementById("result");
  try {
    result.textContent = parent.document.title;
  } catch (error) {
    result.textContent = error.message;
  }
</script>`;

type Theme = "light" | "dark";

/* The site's background, foreground, and muted tokens at --tint 106, since
   the frame cannot read the page's CSS variables. */
const BASE_CSS = `:root{color-scheme:light;background:oklch(0.992 0.002 106);color:oklch(0.145 0.006 106);--muted:oklch(0.556 0.007 106)}
:root[data-theme="dark"]{color-scheme:dark;background:oklch(0.17 0.003 106);color:oklch(0.985 0.002 106);--muted:oklch(0.708 0.004 106)}
body{margin:0;padding:16px 20px;font:14px/1.6 system-ui,sans-serif}
p{margin:0 0 8px}
pre{margin:0;color:var(--muted);font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere}`;

/** The reader's HTML, with the site's colors and a listener for theme messages from this page. */
function documentFor(html: string, theme: Theme, hostOrigin: string) {
  return `<!doctype html>
<html lang="en" data-theme="${theme}">
<head>
<meta charset="utf-8">
<style>${BASE_CSS}</style>
<script>
addEventListener("message", (event) => {
  if (event.origin !== ${JSON.stringify(hostOrigin)}) return;
  if (event.data?.type === "theme") document.documentElement.dataset.theme = event.data.value;
});
</script>
</head>
<body>
${html}
</body>
</html>`;
}

/** The hashed host, shortened the way the page's diagrams draw it. */
const shortHost = (origin: string) =>
  new URL(origin).host.replace(/^([a-z0-9]{4})[a-z0-9]+/, "$1…");

type Status =
  | { state: "rendering" }
  | { state: "ready"; origin: string }
  | { state: "failed"; message: string };

/** Renders the HTML in the editor into a real Safe Content Frame, on a new origin each time. */
export function FrameDemo() {
  const [source, setSource] = useState(SAMPLE);
  const [request, setRequest] = useState({ html: SAMPLE, count: 0 });
  const [status, setStatus] = useState<Status>({ state: "rendering" });
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef<RenderedFrame | null>(null);
  const { resolvedTheme } = useTheme();
  const theme: Theme = resolvedTheme === "dark" ? "dark" : "light";
  const themeRef = useRef(theme);

  useEffect(() => {
    themeRef.current = theme;
    renderedRef.current?.sendMessage({ type: "theme", value: theme });
  }, [theme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const controller = new AbortController();
    let rendered: RenderedFrame | undefined;

    frame
      .renderHtml(
        documentFor(request.html, themeRef.current, window.location.origin),
        container,
        { signal: controller.signal },
      )
      .then(async (result) => {
        if (controller.signal.aborted) {
          result.dispose();
          return;
        }
        rendered = result;
        renderedRef.current = result;
        result.iframe.title = "Rendered HTML";
        setStatus({ state: "ready", origin: result.origin });
        await result.fullyLoadedPromiseWithTimeout(5000);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setStatus({
          state: "failed",
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      controller.abort();
      rendered?.dispose();
      renderedRef.current = null;
    };
  }, [request]);

  const render = () => {
    setStatus({ state: "rendering" });
    setRequest((previous) => ({ html: source, count: previous.count + 1 }));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      render();
    }
  };

  return (
    <div className="flex size-full flex-col">
      <div className="border-foreground/10 flex h-11 shrink-0 items-center gap-3 border-b ps-4 pe-2">
        <p
          aria-live="polite"
          className="min-w-0 flex-1 truncate font-mono text-xs [font-variant-ligatures:none]"
          title={status.state === "ready" ? status.origin : undefined}
        >
          <span className="text-muted-foreground">origin: </span>
          {status.state === "ready" ? (
            shortHost(status.origin)
          ) : status.state === "rendering" ? (
            <>
              <span
                aria-hidden
                className="bg-foreground/[0.06] inline-block h-3 w-44 animate-pulse rounded-sm align-middle motion-reduce:animate-none"
              />
              <span className="sr-only">rendering</span>
            </>
          ) : (
            <span className="text-muted-foreground">none</span>
          )}
        </p>
        <Button
          size="sm"
          variant="ghost"
          className="border-border"
          onClick={render}
        >
          Render
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <textarea
          value={source}
          onChange={(event) => setSource(event.target.value)}
          onKeyDown={onKeyDown}
          aria-label="HTML to render"
          wrap="off"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="bg-foreground/[0.025] dark:bg-foreground/[0.04] focus-visible:ring-ring/50 h-56 w-full shrink-0 resize-none px-4 py-3.5 font-mono text-base leading-relaxed outline-none [font-variant-ligatures:none] focus-visible:ring-2 focus-visible:ring-inset sm:text-[12.5px] md:h-full md:w-1/2"
        />
        <div ref={containerRef} className="relative min-h-0 flex-1">
          {status.state === "failed" ? (
            <p className="text-muted-foreground bg-background absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-pretty">
              The frame did not load: {status.message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
