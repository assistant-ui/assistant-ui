"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SafeContentFrame, type RenderedFrame } from "safe-content-frame";
import { CopyCommandButton } from "@/components/home/copy-command-button";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";

const ANALYTICS_PAGE = "safe-content-frame" as const;

const HIGHLIGHTS = [
  {
    title: "Unique origin",
    description:
      "Each render gets a hashed origin on scf.auiusercontent.com, a separate eTLD+1 from your app.",
  },
  {
    title: "Sandboxed iframe",
    description:
      "Content runs with allow-scripts. It cannot reach the parent page.",
  },
  {
    title: "No parent storage",
    description:
      "Scripts cannot read document.cookie or localStorage on your domain.",
  },
  {
    title: "Vanilla JS",
    description: "Framework-agnostic. No React or DOM-framework dependency.",
  },
] as const;

const DEFAULT_HTML = `<h1>Hello from the sandbox</h1>
<p>This HTML runs in a sandboxed iframe with its own origin.</p>
<script>
  document.body.innerHTML += '<p>Scripts run here. They cannot reach the parent page.</p>';
</script>
<style>
  body {
    font-family: system-ui, sans-serif;
    margin: 0;
    padding: 24px;
    line-height: 1.5;
  }
  h1 { font-size: 1.25rem; font-weight: 560; }
</style>`;

const XSS_HTML = `<h1>XSS probe</h1>
<p>These scripts run in the frame. They cannot touch the host page.</p>
<script>
  try {
    window.parent.document.body.innerHTML = 'HACKED!';
  } catch (e) {
    document.body.innerHTML += '<p>Parent document blocked: ' + e.message + '</p>';
  }
  try {
    document.body.innerHTML += '<p>Cookies: ' + (document.cookie || 'none') + '</p>';
  } catch (e) {
    document.body.innerHTML += '<p>Cookie access blocked</p>';
  }
  document.body.innerHTML += '<p>Top navigation blocked by sandbox</p>';
</script>
<style>
  body {
    font-family: system-ui, sans-serif;
    margin: 0;
    padding: 24px;
    line-height: 1.5;
  }
  h1 { font-size: 1.25rem; font-weight: 560; }
</style>`;

type Preset = "default" | "xss" | "custom";

export default function SafeContentFramePage() {
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [preset, setPreset] = useState<Preset>("default");
  const [status, setStatus] = useState("Ready");
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<RenderedFrame | null>(null);

  const renderSource = useCallback(async (source: string) => {
    const container = containerRef.current;
    if (!container) return;

    frameRef.current?.dispose();
    frameRef.current = null;
    container.replaceChildren();
    setStatus("Rendering");

    try {
      const scf = new SafeContentFrame("assistant-ui-docs", {
        sandbox: ["allow-scripts"],
      });
      const frame = await scf.renderHtml(source, container);
      frameRef.current = frame;
      setStatus(frame.origin);
      try {
        await frame.fullyLoadedPromiseWithTimeout(5000);
      } catch {
        setStatus(`${frame.origin} (load timeout)`);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Render failed");
    }
  }, []);

  useEffect(() => {
    void renderSource(DEFAULT_HTML);
    return () => {
      frameRef.current?.dispose();
      frameRef.current = null;
    };
  }, [renderSource]);

  const applyPreset = (next: string, id: Exclude<Preset, "custom">) => {
    setHtml(next);
    setPreset(id);
    void renderSource(next);
  };

  return (
    <PageFrame pad="sub" className="flex flex-col gap-20 md:gap-28">
      <header className="max-w-2xl">
        <h1 className={typePage}>safe-content-frame</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          Untrusted HTML in a sandboxed iframe. Unique origin per render. Pure
          JS.
        </p>
        <div className="mt-6">
          <CopyCommandButton
            command="npm install safe-content-frame"
            analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
          />
        </div>
      </header>

      <dl className="grid gap-x-16 gap-y-10 sm:grid-cols-2">
        {HIGHLIGHTS.map((item) => (
          <div key={item.title} className="flex flex-col gap-1.5">
            <dt className="text-[15px] font-medium">{item.title}</dt>
            <dd className="text-muted-foreground text-sm leading-relaxed text-pretty">
              {item.description}
            </dd>
          </div>
        ))}
      </dl>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-muted-foreground text-sm">Input</h2>
            <div className="flex flex-wrap items-center gap-1.5">
              <PresetChip
                label="Default"
                active={preset === "default"}
                onClick={() => applyPreset(DEFAULT_HTML, "default")}
              />
              <PresetChip
                label="XSS"
                active={preset === "xss"}
                onClick={() => applyPreset(XSS_HTML, "xss")}
              />
            </div>
          </div>
          <textarea
            value={html}
            onChange={(event) => {
              setHtml(event.target.value);
              setPreset("custom");
            }}
            className="bg-muted/40 focus-visible:ring-ring/50 h-[28rem] w-full resize-none rounded-2xl p-4 font-mono text-[13px] leading-relaxed outline-none focus-visible:ring-1"
            spellCheck={false}
          />
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => void renderSource(html)}
              className="text-sm transition-colors hover:opacity-80"
            >
              Render
            </button>
            <button
              type="button"
              onClick={() => {
                frameRef.current?.dispose();
                frameRef.current = null;
                containerRef.current?.replaceChildren();
                setStatus("Cleared");
              }}
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-muted-foreground text-sm">Output</h2>
            <p className="text-muted-foreground min-w-0 truncate font-mono text-xs">
              {status}
            </p>
          </div>
          <div
            ref={containerRef}
            className="bg-muted/40 h-[28rem] overflow-hidden rounded-2xl [&_iframe]:size-full [&_iframe]:border-0"
          />
        </div>
      </section>
    </PageFrame>
  );
}

function PresetChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "focus-visible:ring-ring/50 rounded-md px-2.5 py-1 text-xs transition-colors outline-none focus-visible:ring-1",
        active
          ? "bg-foreground text-background"
          : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
