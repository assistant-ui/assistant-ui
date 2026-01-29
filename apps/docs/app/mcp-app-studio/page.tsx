"use client";

import { useState, useEffect } from "react";
import {
  CheckIcon,
  CopyIcon,
  Play,
  Wrench,
  Terminal,
  Sparkles,
  Package,
  Monitor,
  ArrowRight,
  Maximize2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

import "./hero-showcase.css";

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

const STEPS = [
  {
    title: "Scaffold your project",
    description:
      "Run the CLI to create a new project with the workbench, example apps, and optionally an MCP server.",
    visual: "scaffold",
  },
  {
    title: "Develop your apps",
    description:
      "Build React components using the universal SDK. It auto-detects the platform and adapts to ChatGPT or MCP hosts.",
    visual: "develop",
  },
  {
    title: "Test with mock data",
    description:
      "Configure mock tool responses to test different scenarios. Simulate user interactions and edge cases.",
    visual: "test",
  },
  {
    title: "Export for production",
    description:
      "Generate self-contained HTML bundles with all dependencies inlined. Deploy to ChatGPT Apps or MCP hosts.",
    visual: "export",
  },
] as const;

const WORKBENCH_URL =
  process.env["NEXT_PUBLIC_WORKBENCH_URL"] ??
  "https://mcp-app-studio-starter.vercel.app";

export default function McpAppStudioPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeSrc = `${WORKBENCH_URL}?component=poi-map`;

  // Listen for fullscreen messages from workbench iframe
  useEffect(() => {
    const preventScroll = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleMessage = (event: MessageEvent) => {
      // Validate message origin matches workbench URL
      const workbenchOrigin = new URL(WORKBENCH_URL).origin;
      if (event.origin !== workbenchOrigin) {
        return; // Reject messages from untrusted origins
      }

      if (event.data?.type === "workbench:fullscreen") {
        if (event.data.value) {
          // Set overflow hidden with !important
          document.documentElement.style.setProperty(
            "overflow",
            "hidden",
            "important",
          );
          document.body.style.setProperty("overflow", "hidden", "important");

          // Also prevent scroll events
          window.addEventListener("scroll", preventScroll, { passive: false });
          window.addEventListener("wheel", preventScroll, { passive: false });
          window.addEventListener("touchmove", preventScroll, {
            passive: false,
          });
        } else {
          // Restore overflow
          document.documentElement.style.removeProperty("overflow");
          document.body.style.removeProperty("overflow");

          // Remove scroll prevention
          window.removeEventListener("scroll", preventScroll);
          window.removeEventListener("wheel", preventScroll);
          window.removeEventListener("touchmove", preventScroll);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      // Cleanup scroll prevention listeners on unmount
      document.documentElement.style.removeProperty("overflow");
      document.body.style.removeProperty("overflow");
      window.removeEventListener("scroll", preventScroll);
      window.removeEventListener("wheel", preventScroll);
      window.removeEventListener("touchmove", preventScroll);
    };
  }, []);

  return (
    <>
      <div className="mx-auto w-full max-w-7xl space-y-10 px-4 pt-14 pb-8 md:space-y-20">
        <div className="flex flex-col gap-6">
          <div className="rainbow-border relative inline-flex w-fit rounded-full p-px text-sm after:absolute after:inset-0 after:-z-10 after:block after:rounded-full">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-4 py-1.5">
              <Sparkles className="size-3.5 text-violet-500" />
              <span className="font-medium text-foreground/80">
                ChatGPT Apps + MCP Apps
              </span>
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="font-medium text-2xl">MCP App Studio</h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              Build interactive apps for AI assistants. One SDK that works with
              both ChatGPT and MCP hosts like Claude Desktop.
            </p>
          </div>

          <CopyCommandButton />

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[13px] text-muted-foreground">
            <Link
              href="https://modelcontextprotocol.io/docs/extensions/apps"
              className="font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              MCP Apps Docs →
            </Link>
            <span className="hidden size-1 rounded-full bg-muted-foreground/20 sm:block" />
            <Link
              href="https://platform.openai.com/docs/guides/building-apps/introduction"
              className="font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              ChatGPT Apps Docs →
            </Link>
            <span className="hidden size-1 rounded-full bg-muted-foreground/20 sm:block" />
            <Link
              href="https://github.com/assistant-ui/assistant-ui/tree/main/packages/mcp-app-studio"
              className="font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              View on GitHub
            </Link>
          </div>
        </div>

        <HeroShowcase onFullscreen={() => setIsFullscreen(true)} />

        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="font-medium text-3xl tracking-tight">
              Everything you need to build apps for AI assistants
            </h2>
            <p className="text-muted-foreground">
              Local development workbench with production-ready export.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="flex flex-col gap-2 rounded-lg bg-muted/50 p-4"
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

        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center gap-2 text-center">
            <h2 className="font-medium text-3xl tracking-tight">
              How It Works
            </h2>
            <p className="text-muted-foreground">
              From scaffold to production in four steps
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {STEPS.map((step, index) => (
              <div
                key={step.title}
                className="group overflow-hidden rounded-xl border border-border/50 bg-muted/30 transition-colors hover:border-border/80"
              >
                <div className="p-1">
                  <StepVisual type={step.visual} />
                </div>
                <div className="flex gap-3 p-4 pt-3">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-500/10 font-medium text-violet-400 text-xs">
                    {index + 1}
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-medium text-sm">{step.title}</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 py-16 text-center">
          <p className="font-medium text-2xl tracking-tight">
            Start building your app today
          </p>
          <div className="flex items-center gap-6">
            <Button asChild>
              <Link href="https://modelcontextprotocol.io/docs/extensions/apps">
                MCP Apps Docs <ArrowRight />
              </Link>
            </Button>
            <Link
              href="https://platform.openai.com/docs/guides/building-apps/introduction"
              className={buttonVariants({
                variant: "outline",
              })}
            >
              ChatGPT Apps Docs
            </Link>
            <Link
              href="https://github.com/assistant-ui/assistant-ui/tree/main/packages/mcp-app-studio"
              className={buttonVariants({
                variant: "outline",
              })}
            >
              View Source
            </Link>
          </div>
        </div>
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm">
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
                onClick={() => setIsFullscreen(false)}
                className="flex size-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                title="Close fullscreen"
              >
                <X className="size-5" />
              </button>
            </div>
            <iframe
              src={iframeSrc}
              className="size-full border-0"
              title="MCP App Studio Workbench (Fullscreen)"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        </div>
      )}
    </>
  );
}

function HeroShowcase({ onFullscreen }: { onFullscreen: () => void }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const iframeSrc = `${WORKBENCH_URL}?component=poi-map`;

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

            <div className="hero-showcase-content relative aspect-[16/10] w-full">
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
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
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
                onLoad={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
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

function CopyCommandButton() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText("npx mcp-app-studio my-app");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copyToClipboard}
      className="group inline-flex w-fit items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 font-mono text-sm transition-all hover:border-border hover:bg-muted/50"
    >
      <span className="text-muted-foreground/70">$</span>
      <span>npx mcp-app-studio my-app</span>
      <div className="relative ml-1 flex size-4 items-center justify-center text-muted-foreground">
        <CheckIcon
          className={cn(
            "absolute size-3.5 text-green-500 transition-all duration-100",
            copied ? "scale-100 opacity-100" : "scale-50 opacity-0",
          )}
        />
        <CopyIcon
          className={cn(
            "absolute size-3.5 transition-all duration-100",
            copied
              ? "scale-50 opacity-0"
              : "scale-100 opacity-50 group-hover:opacity-100",
          )}
        />
      </div>
    </button>
  );
}

function StepVisual({ type }: { type: string }) {
  switch (type) {
    case "scaffold":
      return <ScaffoldVisual />;
    case "develop":
      return <DevelopVisual />;
    case "test":
      return <TestVisual />;
    case "export":
      return <ExportVisual />;
    default:
      return null;
  }
}

function ScaffoldVisual() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-zinc-950 p-3 font-mono text-[10px] leading-relaxed">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-blue-500/5" />
      <div className="relative space-y-1.5">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <span className="text-emerald-400">~</span>
          <span>npx mcp-app-studio my-app</span>
        </div>
        <div className="text-zinc-400">
          <span className="text-violet-400">Creating</span> my-app...
        </div>
        <div className="space-y-0.5 pl-2 text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span>
            <span>package.json</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span>
            <span>src/apps/</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span>
            <span>workbench/</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-blue-400">✓</span>
            <span>mcp-server/</span>
          </div>
        </div>
        <div className="pt-1 text-emerald-400">
          Done! Run: cd my-app && pnpm dev
        </div>
      </div>
      <div className="absolute right-3 bottom-3 flex gap-1">
        <div className="size-1.5 rounded-full bg-zinc-700" />
        <div className="size-1.5 rounded-full bg-zinc-700" />
        <div className="size-1.5 rounded-full bg-zinc-700" />
      </div>
    </div>
  );
}

function DevelopVisual() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-zinc-950">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-violet-500/5" />
      <div className="flex h-full">
        <div className="w-1/2 border-zinc-800 border-r p-2">
          <div className="mb-1.5 flex items-center gap-1 text-[9px] text-zinc-500">
            <div className="size-2 rounded-sm bg-blue-500/60" />
            <span>App.tsx</span>
          </div>
          <div className="space-y-0.5 font-mono text-[8px] leading-relaxed">
            <div>
              <span className="text-violet-400">export</span>{" "}
              <span className="text-blue-400">function</span>{" "}
              <span className="text-amber-300">App</span>
              <span className="text-zinc-500">() {"{"}</span>
            </div>
            <div className="pl-2">
              <span className="text-violet-400">const</span>{" "}
              <span className="text-zinc-300">result</span>{" "}
              <span className="text-zinc-500">=</span>{" "}
              <span className="text-blue-400">useToolResult</span>
              <span className="text-zinc-500">();</span>
            </div>
            <div className="pl-2">
              <span className="text-violet-400">return</span>{" "}
              <span className="text-zinc-500">(</span>
            </div>
            <div className="pl-4">
              <span className="text-emerald-400">{"<Map"}</span>{" "}
              <span className="text-amber-300">data</span>
              <span className="text-zinc-500">=</span>
              <span className="text-zinc-500">{"{"}</span>
              <span className="text-zinc-300">result</span>
              <span className="text-zinc-500">{"}"}</span>{" "}
              <span className="text-emerald-400">/{">"}</span>
            </div>
            <div className="pl-2">
              <span className="text-zinc-500">);</span>
            </div>
            <div>
              <span className="text-zinc-500">{"}"}</span>
            </div>
          </div>
        </div>
        <div className="flex w-1/2 flex-col">
          <div className="flex items-center gap-1 border-zinc-800 border-b px-2 py-1 text-[9px] text-zinc-500">
            <div className="size-2 rounded-full bg-emerald-500/60" />
            <span>Preview</span>
          </div>
          <div className="relative flex-1 bg-zinc-900/50 p-2">
            <div className="h-full rounded bg-zinc-800/50">
              <div className="flex h-full items-center justify-center">
                <div className="relative size-12 rounded-md bg-gradient-to-br from-blue-500/20 to-violet-500/20">
                  <div className="absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400" />
                  <div className="absolute top-2 right-2 size-1 rounded-full bg-blue-400/60" />
                  <div className="absolute bottom-2 left-3 size-1 rounded-full bg-emerald-400/60" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TestVisual() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-zinc-950 p-3">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-emerald-500/5" />
      <div className="relative space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-[9px] text-zinc-400">
            Mock Response
          </span>
          <div className="flex gap-1">
            <div className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[8px] text-emerald-400">
              200
            </div>
          </div>
        </div>
        <div className="rounded-md bg-zinc-900/80 p-2 font-mono text-[8px] leading-relaxed">
          <div>
            <span className="text-zinc-500">{"{"}</span>
          </div>
          <div className="pl-2">
            <span className="text-violet-400">&quot;locations&quot;</span>
            <span className="text-zinc-500">: [</span>
          </div>
          <div className="pl-4">
            <span className="text-zinc-500">{"{"}</span>{" "}
            <span className="text-blue-400">&quot;name&quot;</span>
            <span className="text-zinc-500">:</span>{" "}
            <span className="text-amber-300">&quot;Paris&quot;</span>
            <span className="text-zinc-500">,</span>{" "}
            <span className="text-zinc-500">...</span>{" "}
            <span className="text-zinc-500">{"}"}</span>
          </div>
          <div className="pl-2">
            <span className="text-zinc-500">],</span>
          </div>
          <div className="pl-2">
            <span className="text-violet-400">&quot;status&quot;</span>
            <span className="text-zinc-500">:</span>{" "}
            <span className="text-amber-300">&quot;success&quot;</span>
          </div>
          <div>
            <span className="text-zinc-500">{"}"}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 rounded bg-zinc-800/50 px-2 py-1">
            <div className="mb-0.5 text-[7px] text-zinc-600">Delay</div>
            <div className="font-mono text-[9px] text-zinc-400">250ms</div>
          </div>
          <div className="flex-1 rounded bg-zinc-800/50 px-2 py-1">
            <div className="mb-0.5 text-[7px] text-zinc-600">Calls</div>
            <div className="font-mono text-[9px] text-zinc-400">12</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportVisual() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-zinc-950 p-3">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-violet-500/5" />
      <div className="relative flex h-full flex-col">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium text-[9px] text-zinc-400">
            Production Bundle
          </span>
          <div className="rounded bg-violet-500/20 px-1.5 py-0.5 font-mono text-[8px] text-violet-400">
            Ready
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2 rounded-md bg-zinc-900/80 px-2 py-1.5">
            <div className="flex size-5 items-center justify-center rounded bg-gradient-to-br from-violet-500/30 to-blue-500/30">
              <Package className="size-3 text-violet-300" />
            </div>
            <div className="flex-1">
              <div className="font-mono text-[9px] text-zinc-300">app.html</div>
              <div className="text-[7px] text-zinc-600">
                Self-contained bundle
              </div>
            </div>
            <div className="font-mono text-[8px] text-zinc-500">42kb</div>
          </div>
          <div className="flex items-center justify-center gap-4 py-1">
            <div className="text-center">
              <div className="mb-0.5 flex size-6 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/50">
                <span className="font-mono text-[8px] text-emerald-400">C</span>
              </div>
              <div className="text-[7px] text-zinc-600">ChatGPT</div>
            </div>
            <div className="h-px w-4 bg-zinc-800" />
            <div className="text-center">
              <div className="mb-0.5 flex size-6 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/50">
                <span className="font-mono text-[8px] text-violet-400">M</span>
              </div>
              <div className="text-[7px] text-zinc-600">MCP</div>
            </div>
          </div>
        </div>
        <div className="mt-auto flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-1">
          <CheckIcon className="size-2.5 text-emerald-400" />
          <span className="text-[8px] text-emerald-400">Exported to dist/</span>
        </div>
      </div>
    </div>
  );
}
