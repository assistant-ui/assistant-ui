"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckIcon,
  Maximize2,
  Monitor,
  Package,
  Play,
  Plug,
  Sparkles,
  Terminal,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import ShikiHighlighter from "react-shiki";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { CopyCommandButton } from "@/components/home/copy-command-button";
import { Button, buttonVariants } from "@/components/ui/button";
import "react-shiki/css";

import "./hero-showcase.css";

const ANALYTICS_PAGE = "mcp-app-studio" as const;

const MCP_APP_STUDIO_SECTIONS = {
  workbench: "workbench",
  capabilities: "capabilities",
  export: "export",
} as const;

type McpAppStudioSection =
  (typeof MCP_APP_STUDIO_SECTIONS)[keyof typeof MCP_APP_STUDIO_SECTIONS];

const OUTBOUND_URLS = {
  mcpAppsDocs: "https://modelcontextprotocol.io/docs/extensions/apps",
  chatgptAppsSdk: "https://developers.openai.com/apps-sdk/",
  cliSource:
    "https://github.com/assistant-ui/assistant-ui/tree/main/packages/mcp-app-studio",
  workbenchTemplate: "https://github.com/assistant-ui/mcp-app-studio-starter",
} as const;

const OUTBOUND_LINKS = {
  hero: {
    mcpAppsDocs: { label: "MCP Apps Docs", href: OUTBOUND_URLS.mcpAppsDocs },
    chatgptAppsSdk: {
      label: "ChatGPT Apps SDK",
      href: OUTBOUND_URLS.chatgptAppsSdk,
    },
    cliSource: { label: "CLI source", href: OUTBOUND_URLS.cliSource },
    workbenchTemplate: {
      label: "Workbench template",
      href: OUTBOUND_URLS.workbenchTemplate,
    },
  },
  footer: {
    mcpAppsDocs: { label: "MCP Apps Docs", href: OUTBOUND_URLS.mcpAppsDocs },
    chatgptAppsSdk: {
      label: "ChatGPT Apps SDK",
      href: OUTBOUND_URLS.chatgptAppsSdk,
    },
    workbenchTemplate: {
      label: "Workbench template",
      href: OUTBOUND_URLS.workbenchTemplate,
    },
    viewSource: { label: "View source", href: OUTBOUND_URLS.cliSource },
  },
} as const;

const QUICKSTART_COMMAND = "npx mcp-app-studio my-app";

const FEATURES = [
  {
    title: "Live Preview",
    description:
      "See your apps render in real-time. Test across desktop, tablet, and mobile viewports with hot reload.",
    icon: Play,
    iconColor: "text-green-400",
  },
  {
    title: "Mock Tool Responses",
    description:
      "Simulate tool calls with configurable JSON responses. Test success, error, and edge cases without a backend.",
    icon: Wrench,
    iconColor: "text-orange-400",
  },
  {
    title: "MCP Server Scaffold",
    description:
      "Optional MCP server template included. Run both frontend app and backend tools with a single command.",
    icon: Terminal,
    iconColor: "text-blue-400",
  },
  {
    title: "Production Export",
    description:
      "Export your apps as self-contained HTML bundles with all dependencies inlined, ready for deployment.",
    icon: Package,
    iconColor: "text-purple-400",
  },
  {
    title: "Display Modes",
    description:
      "Preview inline, popup, and fullscreen modes. See exactly how your apps appear in ChatGPT or Claude.",
    icon: Monitor,
    iconColor: "text-cyan-400",
  },
  {
    title: "Universal SDK",
    description:
      "Write once, run everywhere. Auto-detects the host platform (ChatGPT or MCP) and uses the appropriate APIs.",
    icon: Sparkles,
    iconColor: "text-violet-400",
  },
] as const;

const PLATFORM_CAPABILITIES = [
  {
    feature: "Widget state",
    description: "Persist and restore widget state via host APIs.",
    chatgpt: true,
    mcp: false,
  },
  {
    feature: "Model context",
    description: "Read/write model context via MCP (Claude support).",
    chatgpt: false,
    mcp: true,
  },
  {
    feature: "Tool mocking",
    description: "Mock tool responses locally while you develop.",
    chatgpt: true,
    mcp: true,
  },
] as const;

const FEATURE_GATE_SNIPPET = `import { useFeature } from "mcp-app-studio";

const hasWidgetState = useFeature("widgetState");  // ChatGPT-only
const hasModelContext = useFeature("modelContext"); // MCP-only

return (
  <>
    {hasWidgetState && <StatePersistence />}
    {hasModelContext && <ContextPanel />}
  </>
);`;

const EXPORT_TREE_SNIPPET = `export/
├── manifest.json
├── README.md
└── widget/
    ├── index.html
    ├── widget.js
    └── widget.css`;

const WORKBENCH_URL =
  process.env["NEXT_PUBLIC_WORKBENCH_URL"] ??
  "https://mcp-app-studio-starter.vercel.app";

export default function McpAppStudioPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeSrc = `${WORKBENCH_URL}?component=poi-map&demo=true`;
  const workbenchSectionRef = useRef<HTMLElement | null>(null);
  const capabilitiesSectionRef = useRef<HTMLDivElement | null>(null);
  const exportSectionRef = useRef<HTMLDivElement | null>(null);

  const trackOutboundLinkClick = (
    section: "hero" | "footer",
    link: { label: string; href: string },
  ) => {
    analytics.outbound.linkClicked(link.href, link.label, {
      page: ANALYTICS_PAGE,
      section,
    });
  };

  useEffect(() => {
    if (!isFullscreen) return;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const tracked = new Set<McpAppStudioSection>();
    const observers: IntersectionObserver[] = [];

    const observeOnce = (
      element: Element | null,
      section: McpAppStudioSection,
    ) => {
      if (!element) return;
      if (tracked.has(section)) return;

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            if (tracked.has(section)) continue;

            tracked.add(section);
            analytics.mcpAppStudio.sectionViewed(section);
            observer.disconnect();
          }
        },
        { threshold: 0.4 },
      );

      observer.observe(element);
      observers.push(observer);
    };

    observeOnce(workbenchSectionRef.current, MCP_APP_STUDIO_SECTIONS.workbench);
    observeOnce(
      capabilitiesSectionRef.current,
      MCP_APP_STUDIO_SECTIONS.capabilities,
    );
    observeOnce(exportSectionRef.current, MCP_APP_STUDIO_SECTIONS.export);

    return () => {
      for (const observer of observers) observer.disconnect();
    };
  }, []);

  return (
    <>
      <div className="mx-auto w-full max-w-7xl space-y-10 px-4 pt-14 pb-8 md:space-y-20">
        <div className="flex flex-col gap-6">
          <div className="rainbow-border relative inline-flex w-fit rounded-full p-px text-sm after:absolute after:inset-0 after:-z-10 after:block after:rounded-full">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-4 py-1.5">
              <Plug className="size-3.5 text-violet-500" />
              <span className="font-medium text-foreground/80">MCP Apps</span>
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="max-w-xl font-medium text-3xl tracking-tight">
              Universal SDK for MCP App Development
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Local first, hot-reloading DX for rapid iteration. Export for
              ChatGPT, Claude, and any other compatible MCP host.
            </p>
          </div>

          <CopyCommandButton
            command={QUICKSTART_COMMAND}
            analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
          />

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[13px] text-muted-foreground">
            <Link
              href={OUTBOUND_LINKS.hero.mcpAppsDocs.href}
              onClick={() =>
                trackOutboundLinkClick("hero", OUTBOUND_LINKS.hero.mcpAppsDocs)
              }
              className="font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              MCP Apps Docs →
            </Link>
            <span className="hidden size-1 rounded-full bg-muted-foreground/20 sm:block" />
            <Link
              href={OUTBOUND_LINKS.hero.chatgptAppsSdk.href}
              onClick={() =>
                trackOutboundLinkClick(
                  "hero",
                  OUTBOUND_LINKS.hero.chatgptAppsSdk,
                )
              }
              className="font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              ChatGPT Apps SDK →
            </Link>
            <span className="hidden size-1 rounded-full bg-muted-foreground/20 sm:block" />
            <Link
              href={OUTBOUND_LINKS.hero.cliSource.href}
              onClick={() =>
                trackOutboundLinkClick("hero", OUTBOUND_LINKS.hero.cliSource)
              }
              className="font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              CLI source →
            </Link>
            <span className="hidden size-1 rounded-full bg-muted-foreground/20 sm:block" />
            <Link
              href={OUTBOUND_LINKS.hero.workbenchTemplate.href}
              onClick={() =>
                trackOutboundLinkClick(
                  "hero",
                  OUTBOUND_LINKS.hero.workbenchTemplate,
                )
              }
              className="font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              Workbench template →
            </Link>
          </div>
        </div>

        <section ref={workbenchSectionRef} className="space-y-4">
          <div className="space-y-1">
            <h2 className="font-medium text-2xl tracking-tight">
              Try the workbench
            </h2>
            <p className="text-muted-foreground">
              A local host simulator for chat-style platforms like ChatGPT and
              Claude. Preview your app, mock tool calls, and export for
              production.
            </p>
          </div>

          <HeroShowcase
            iframeSrc={iframeSrc}
            onFullscreen={() => {
              analytics.mcpAppStudio.workbenchFullscreenToggled(true);
              setIsFullscreen(true);
            }}
          />
        </section>

        <div ref={capabilitiesSectionRef} className="flex flex-col gap-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="font-medium text-3xl tracking-tight">
              Know what ships where
            </h2>
            <p className="text-muted-foreground">
              One API surface, with platform-specific capabilities for ChatGPT
              and Claude that you can feature-gate.
            </p>
          </div>

          <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-border/50 bg-muted/30">
            <CodeBlock language="tsx" code={FEATURE_GATE_SNIPPET} />
          </div>

          <div className="overflow-hidden rounded-xl border border-border/50 bg-muted/30">
            <div className="grid grid-cols-[1fr_88px_88px] items-center gap-3 border-border/50 border-b bg-background/40 px-4 py-2 text-muted-foreground text-xs">
              <div>Capability</div>
              <div className="text-center">ChatGPT</div>
              <div className="text-center">Claude</div>
            </div>
            <div className="divide-y divide-border/50">
              {PLATFORM_CAPABILITIES.map((row) => (
                <div
                  key={row.feature}
                  className="grid grid-cols-[1fr_88px_88px] items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{row.feature}</div>
                    <div className="mt-0.5 text-muted-foreground text-xs">
                      {row.description}
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    {row.chatgpt ? (
                      <CheckIcon className="size-4 text-emerald-400" />
                    ) : (
                      <X className="size-4 text-zinc-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-center">
                    {row.mcp ? (
                      <CheckIcon className="size-4 text-emerald-400" />
                    ) : (
                      <X className="size-4 text-zinc-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="font-medium text-3xl tracking-tight">
              Everything you need to build apps for AI assistants
            </h2>
            <p className="text-muted-foreground">
              Local development workbench with a production-ready export flow.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:border-border/80"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <Icon className={cn("size-4", feature.iconColor)} />
                    {feature.title}
                  </span>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div ref={exportSectionRef} className="flex flex-col gap-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="font-medium text-3xl tracking-tight">
              Export output
            </h2>
            <p className="text-muted-foreground">
              What <code>npm run export</code> generates.
            </p>
          </div>

          <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border border-border/50 bg-muted/30">
            <div className="border-border/50 border-b bg-background/40 px-4 py-2 font-mono text-muted-foreground text-xs">
              export/
            </div>
            <CodeBlock language="text" code={EXPORT_TREE_SNIPPET} />
          </div>

          <p className="text-center text-muted-foreground text-xs">
            Deploy the <code>widget/</code> folder to any static host, then
            point <code>manifest.json</code> at its URL.
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 py-16 text-center">
          <p className="font-medium text-2xl tracking-tight">
            Start building your app today
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link
                href={OUTBOUND_LINKS.footer.mcpAppsDocs.href}
                onClick={() =>
                  trackOutboundLinkClick(
                    "footer",
                    OUTBOUND_LINKS.footer.mcpAppsDocs,
                  )
                }
              >
                MCP Apps Docs <ArrowRight />
              </Link>
            </Button>
            <Link
              href={OUTBOUND_LINKS.footer.chatgptAppsSdk.href}
              onClick={() =>
                trackOutboundLinkClick(
                  "footer",
                  OUTBOUND_LINKS.footer.chatgptAppsSdk,
                )
              }
              className={buttonVariants({ variant: "outline" })}
            >
              ChatGPT Apps SDK
            </Link>
            <Link
              href={OUTBOUND_LINKS.footer.workbenchTemplate.href}
              onClick={() =>
                trackOutboundLinkClick(
                  "footer",
                  OUTBOUND_LINKS.footer.workbenchTemplate,
                )
              }
              className={buttonVariants({ variant: "outline" })}
            >
              Workbench template
            </Link>
            <Link
              href={OUTBOUND_LINKS.footer.viewSource.href}
              onClick={() =>
                trackOutboundLinkClick(
                  "footer",
                  OUTBOUND_LINKS.footer.viewSource,
                )
              }
              className={buttonVariants({ variant: "outline" })}
            >
              View source
            </Link>
          </div>
        </div>
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="relative h-[95vh] w-[95vw] overflow-hidden rounded-xl bg-zinc-950 shadow-2xl">
            <div className="flex h-12 items-center justify-between border-zinc-800 border-b bg-zinc-900 px-4">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-red-500/80" />
                  <div className="size-3 rounded-full bg-yellow-500/80" />
                  <div className="size-3 rounded-full bg-green-500/80" />
                </div>
                <span className="font-mono text-sm text-zinc-400">
                  MCP App Studio Workbench
                </span>
              </div>
              <button
                onClick={() => {
                  analytics.mcpAppStudio.workbenchFullscreenToggled(false);
                  setIsFullscreen(false);
                }}
                className="flex size-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                title="Close fullscreen"
              >
                <X className="size-5" />
              </button>
            </div>
            <iframe
              src={iframeSrc}
              className="size-full border-0"
              onLoad={() =>
                analytics.mcpAppStudio.workbenchIframeLoaded("fullscreen")
              }
              onError={() =>
                analytics.mcpAppStudio.workbenchIframeFailed("fullscreen")
              }
              title="MCP App Studio Workbench (Fullscreen)"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        </div>
      )}
    </>
  );
}

function HeroShowcase({
  iframeSrc,
  onFullscreen,
}: {
  iframeSrc: string;
  onFullscreen: () => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const loadStartTimeMsRef = useRef<number>(performance.now());

  return (
    <div className="hero-showcase-section relative">
      <div className="hero-showcase-glow" />

      <div className="hero-showcase-container">
        <div className="hero-showcase-frame group relative">
          <div className="hero-showcase-border" />

          <div className="relative overflow-hidden rounded-xl bg-zinc-950">
            <div className="flex h-10 items-center gap-2 border-zinc-800 border-b bg-zinc-900/80 px-4">
              <div className="flex gap-1.5">
                <div className="size-3 rounded-full bg-red-500/80" />
                <div className="size-3 rounded-full bg-yellow-500/80" />
                <div className="size-3 rounded-full bg-green-500/80" />
              </div>
              <div className="ml-4 flex-1">
                <div className="mx-auto w-fit rounded-md bg-zinc-800/60 px-3 py-1 font-mono text-xs text-zinc-400">
                  {new URL(WORKBENCH_URL).host}
                </div>
              </div>
              <button
                onClick={onFullscreen}
                className="flex size-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                title="Fullscreen demo"
              >
                <Maximize2 className="size-3.5" />
              </button>
            </div>

            <div className="hero-showcase-content relative aspect-16/10 w-full">
              {!isLoaded && !hasError && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950">
                  <div className="flex flex-col items-center gap-3">
                    <div className="size-6 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
                    <p className="text-sm text-zinc-500">
                      Loading workbench...
                    </p>
                  </div>
                </div>
              )}

              {hasError && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-linear-to-br from-zinc-900 via-zinc-950 to-black">
                  <div className="hero-showcase-grid" />
                  <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                    <div className="rounded-full bg-zinc-800/50 p-4">
                      <Play className="size-8 text-zinc-400" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="font-medium text-zinc-300">
                        Workbench not running
                      </p>
                      <p className="max-w-xs text-sm text-zinc-500">
                        Run{" "}
                        <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-xs">
                          npx mcp-app-studio
                        </code>{" "}
                        to start
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <iframe
                src={iframeSrc}
                className={cn(
                  "size-full border-0 transition-opacity duration-300",
                  isLoaded && !hasError ? "opacity-100" : "opacity-0",
                )}
                onLoad={() => {
                  setIsLoaded(true);
                  analytics.mcpAppStudio.workbenchIframeLoaded(
                    "inline",
                    Math.round(performance.now() - loadStartTimeMsRef.current),
                  );
                }}
                onError={() => {
                  setHasError(true);
                  analytics.mcpAppStudio.workbenchIframeFailed(
                    "inline",
                    Math.round(performance.now() - loadStartTimeMsRef.current),
                  );
                }}
                title="MCP App Studio Workbench"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeBlock({
  code,
  language,
  className,
}: {
  code: string;
  language: string;
  className?: string;
}) {
  return (
    <ShikiHighlighter
      language={language}
      theme={{ dark: "github-dark-default", light: "github-light-default" }}
      addDefaultStyles={false}
      showLanguage={false}
      defaultColor={false}
      className={cn(
        "[&_pre]:scrollbar-none [&_.line:last-child:empty]:hidden [&_pre]:overflow-x-auto [&_pre]:bg-transparent! [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-[12px] [&_pre]:leading-relaxed",
        className,
      )}
    >
      {code.trim()}
    </ShikiHighlighter>
  );
}
