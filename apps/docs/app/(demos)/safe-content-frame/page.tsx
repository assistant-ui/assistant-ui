"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { SafeContentFrame, type RenderedFrame } from "safe-content-frame";
import { CopyCommandButton } from "@/components/shared/copy-command-button";
import { Highlight } from "@/components/shared/highlight";
import { CodeBlock } from "@/components/ui/code-block";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
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

const SURFACE = [
  "renderHtml",
  "renderRaw",
  "renderPdf",
  "iframe",
  "origin",
  "sendMessage",
  "fullyLoadedPromiseWithTimeout",
  "dispose",
  "useShadowDom",
  "enableBrowserCaching",
  "sandbox",
  "salt",
] as const;

const SNIPPET = `import { SafeContentFrame } from "safe-content-frame";

const frame = new SafeContentFrame("my-app");

const rendered = await frame.renderHtml(modelGeneratedHtml, container);
await rendered.fullyLoadedPromiseWithTimeout(5000);

rendered.sendMessage({ type: "theme", value: "dark" });

// later
rendered.dispose();`;

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
  const [origin, setOrigin] = useState<string | null>(null);
  const [status, setStatus] = useState("rendering");
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<RenderedFrame | null>(null);
  const generationRef = useRef(0);

  const renderSource = useCallback(async (source: string) => {
    const container = containerRef.current;
    if (!container) return;

    const generation = ++generationRef.current;
    frameRef.current?.dispose();
    frameRef.current = null;
    container.replaceChildren();
    setOrigin(null);
    setStatus("rendering");

    try {
      const scf = new SafeContentFrame("assistant-ui-docs", {
        sandbox: ["allow-scripts"],
      });
      const frame = await scf.renderHtml(source, container);
      if (generation !== generationRef.current) {
        frame.dispose();
        return;
      }
      frameRef.current = frame;
      setOrigin(frame.origin);
      setStatus("live");
      try {
        await frame.fullyLoadedPromiseWithTimeout(5000);
      } catch {
        if (generation === generationRef.current) setStatus("load timeout");
      }
    } catch (error) {
      if (generation === generationRef.current) {
        setStatus(error instanceof Error ? error.message : "render failed");
      }
    }
  }, []);

  useEffect(() => {
    void renderSource(DEFAULT_HTML);
    return () => {
      generationRef.current += 1;
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
    <PageFrame pad="sub">
      <header className="max-w-2xl">
        <h1 className={typePage}>Untrusted content, contained.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          Render model-generated HTML, PDFs, or any blob in a sandboxed iframe
          with a hashed origin per render, on a separate domain from your app.
          Pure JS.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <CopyCommandButton
            command="npm install safe-content-frame"
            analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
          />
          <a
            href="https://github.com/assistant-ui/assistant-ui/tree/main/packages/safe-content-frame"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            README on GitHub
          </a>
        </div>
      </header>

      <div className="mt-12 grid gap-10 md:mt-16 lg:grid-cols-2 lg:gap-8">
        <figure className="flex flex-col">
          <div className="border-foreground/10 flex flex-1 flex-col border">
            <div className="border-foreground/10 text-muted-foreground flex h-9 items-center justify-between border-b px-3.5 font-mono text-[11px] tracking-wide">
              <span>input · html</span>
              <span className="flex items-center gap-1">
                <PresetTab
                  label="hello"
                  active={preset === "default"}
                  onClick={() => applyPreset(DEFAULT_HTML, "default")}
                />
                <PresetTab
                  label="xss probe"
                  active={preset === "xss"}
                  onClick={() => applyPreset(XSS_HTML, "xss")}
                />
              </span>
            </div>
            <textarea
              value={html}
              onChange={(event) => {
                setHtml(event.target.value);
                setPreset("custom");
              }}
              className="h-[26rem] w-full flex-1 resize-none bg-transparent p-4 font-mono text-[12.5px] leading-relaxed outline-none"
              spellCheck={false}
            />
            <div className="border-foreground/10 flex h-9 items-center gap-5 border-t px-3.5 font-mono text-[11px] tracking-wide">
              <button
                type="button"
                onClick={() => void renderSource(html)}
                className="hover:text-foreground/70 cursor-pointer transition-colors"
              >
                render
              </button>
              <button
                type="button"
                onClick={() => {
                  generationRef.current += 1;
                  frameRef.current?.dispose();
                  frameRef.current = null;
                  containerRef.current?.replaceChildren();
                  setOrigin(null);
                  setStatus("cleared");
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                clear
              </button>
            </div>
          </div>
          <figcaption className="text-muted-foreground/70 mt-2 font-mono text-[11px] tracking-wide">
            fig. 01 · the attempt · edit and render
          </figcaption>
        </figure>

        <figure className="flex flex-col">
          <div className="border-foreground/10 flex flex-1 flex-col border">
            <div className="border-foreground/10 text-muted-foreground flex h-9 items-center justify-between gap-4 border-b px-3.5 font-mono text-[11px] tracking-wide">
              <span>output · sandbox</span>
              <span className="flex min-w-0 items-center gap-1.5">
                {status === "live" ? (
                  <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-blue-500 motion-reduce:animate-none" />
                ) : null}
                {status}
              </span>
            </div>
            <div
              ref={containerRef}
              className="min-h-[26rem] flex-1 overflow-hidden [&_iframe]:size-full [&_iframe]:border-0"
            />
          </div>
          <figcaption className="text-muted-foreground/70 mt-2 flex min-w-0 items-baseline justify-between gap-4 font-mono text-[11px] tracking-wide">
            <span className="shrink-0">fig. 02 · the containment</span>
            {origin ? (
              <span className="truncate" title={origin}>
                {origin.replace("https://", "")}
              </span>
            ) : null}
          </figcaption>
        </figure>
      </div>

      <div className="border-foreground/10 mt-16 border-t md:mt-20">
        <section className="divide-foreground/10 border-foreground/10 grid gap-8 border-b py-10 md:grid-cols-2 md:gap-y-10 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:py-12">
          {HIGHLIGHTS.map((item) => (
            <div
              key={item.title}
              className="lg:px-8 lg:first:ps-0 lg:last:pe-0"
            >
              <h2 className="text-sm font-medium">{item.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
                {item.description}
              </p>
            </div>
          ))}
        </section>

        <section className="border-foreground/10 border-b py-10 md:py-12">
          <p className={typeEyebrow}>The setup</p>
          <CodeBlock title="untrusted.ts" className="my-0 mt-6 max-w-[44rem]">
            <Highlight code={SNIPPET} language="ts" />
          </CodeBlock>
        </section>

        <section className="border-foreground/10 border-b py-10 md:py-12">
          <div className="flex items-baseline justify-between">
            <p className={typeEyebrow}>The surface</p>
            <span className="text-muted-foreground/60 font-mono text-[11px] tracking-wide tabular-nums">
              {SURFACE.length}
            </span>
          </div>
          <p className="text-muted-foreground mt-6 flex max-w-[52rem] flex-wrap gap-x-6 gap-y-2.5 font-mono text-[13px]">
            {SURFACE.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </p>
          <p className="text-muted-foreground/70 mt-6 max-w-[52ch] text-sm leading-relaxed">
            Three renderers, a handle per frame, and four options, including a
            shadow-DOM variant at safe-content-frame/shadow_dom.
          </p>
        </section>
      </div>

      <footer className="mt-16 flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          One of the primitives we extracted along the way,{" "}
          <a href="/oss" className="text-foreground font-medium">
            everything we build in the open
          </a>
          .
        </p>
        <a
          href="https://github.com/assistant-ui/assistant-ui/tree/main/packages/safe-content-frame"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          Threat model and full reference in the README
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </footer>
    </PageFrame>
  );
}

function PresetTab({
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
        "cursor-pointer px-2 py-0.5 transition-colors",
        active
          ? "bg-foreground/[0.06] text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
