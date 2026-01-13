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
      "See your widgets render in real-time. Test across desktop, tablet, and mobile viewports with hot reload.",
    icon: Play,
  },
  {
    title: "Mock Tool Responses",
    description:
      "Simulate tool calls with configurable JSON responses. Test success, error, and edge cases without a backend.",
    icon: Wrench,
  },
  {
    title: "MCP Server Scaffold",
    description:
      "Optional MCP server template included. Run both frontend widget and backend tools with a single command.",
    icon: Terminal,
  },
  {
    title: "Production Export",
    description:
      "Export your widgets as self-contained HTML bundles with all dependencies inlined, ready for ChatGPT.",
    icon: Package,
  },
  {
    title: "Display Modes",
    description:
      "Preview inline, popup, and fullscreen modes. See exactly how your app will appear inside ChatGPT.",
    icon: Monitor,
  },
  {
    title: "SDK Guide Assistant",
    description:
      "Built-in AI assistant that knows the OpenAI Apps SDK docs. Get help with configuration and debugging.",
    icon: Sparkles,
  },
] as const;

const STEPS = [
  {
    title: "Scaffold your project",
    description:
      "Run the CLI to create a new project with the workbench, example widgets, and optionally an MCP server.",
  },
  {
    title: "Develop your widgets",
    description:
      "Build React components that use the window.openai SDK. The workbench provides live preview and hot reload.",
  },
  {
    title: "Test with mock data",
    description:
      "Configure mock tool responses to test different scenarios. Simulate user interactions and edge cases.",
  },
  {
    title: "Export for production",
    description:
      "Generate self-contained HTML bundles with all dependencies inlined. Deploy to ChatGPT with confidence.",
  },
] as const;

const WORKBENCH_URL =
  process.env["NEXT_PUBLIC_WORKBENCH_URL"] ?? "http://localhost:3002";

export default function ChatGptAppStudioPage() {
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
      <div className="mx-auto w-full max-w-7xl space-y-10 px-4 pt-14 pb-8 md:space-y-16">
        <div className="flex flex-col gap-6">
          <div className="rainbow-border relative inline-flex w-fit rounded-full p-px text-sm after:absolute after:inset-0 after:-z-10 after:block after:rounded-full">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-4 py-1.5">
              <Sparkles className="size-3.5 text-violet-500" />
              <span className="font-medium text-foreground/80">
                OpenAI Apps SDK
              </span>
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="font-medium text-2xl">ChatGPT App Studio</h1>
            <p className="max-w-lg text-lg text-muted-foreground">
              Build and preview ChatGPT Apps locally. A development workbench
              with live preview, mock tool responses, and production export.
            </p>
          </div>

          <CopyCommandButton />

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[13px] text-muted-foreground">
            <Link
              href="https://platform.openai.com/docs/guides/building-apps/introduction"
              className="font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              OpenAI Apps SDK Docs →
            </Link>
            <span className="hidden size-1 rounded-full bg-muted-foreground/20 sm:block" />
            <Link
              href="https://github.com/assistant-ui/assistant-ui/tree/main/packages/chatgpt-app-studio"
              className="font-medium text-foreground/60 transition-colors hover:text-foreground"
            >
              View on GitHub
            </Link>
          </div>
        </div>

        <HeroShowcase onFullscreen={() => setIsFullscreen(true)} />

        <div className="space-y-6 md:space-y-8">
          <div className="text-center">
            <h2 className="mb-2 font-medium text-2xl md:text-3xl">
              Everything you need to build ChatGPT Apps
            </h2>
            <p className="text-base text-muted-foreground md:text-xl">
              Local development workbench with production-ready export
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="flex flex-col gap-3">
                  <Icon className="size-5 text-muted-foreground" />
                  <div className="flex flex-col gap-1">
                    <h3 className="font-medium">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6 md:space-y-8">
          <div className="text-center">
            <h2 className="mb-2 font-medium text-2xl md:text-3xl">
              How It Works
            </h2>
            <p className="text-base text-muted-foreground md:text-xl">
              From scaffold to production in four steps.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:gap-6">
            {STEPS.map((step, index) => (
              <div key={step.title} className="flex gap-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-sm">
                  {index + 1}
                </div>
                <div className="flex flex-col gap-1 pt-0.5">
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center space-y-4 py-6 text-center md:space-y-6 md:py-8">
          <p className="font-medium text-xl tracking-tight md:text-2xl">
            Start building your ChatGPT App today.
          </p>
          <div className="flex items-center gap-4">
            <Button asChild>
              <Link href="https://platform.openai.com/docs/guides/building-apps/introduction">
                Read the Docs <ArrowRight />
              </Link>
            </Button>
            <Link
              href="https://github.com/assistant-ui/assistant-ui/tree/main/packages/chatgpt-app-studio"
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
                  ChatGPT App Studio Workbench
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
              title="ChatGPT App Studio Workbench (Fullscreen)"
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
                          npx chatgpt-app-studio
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
                title="ChatGPT App Studio Workbench"
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
    navigator.clipboard.writeText("npx chatgpt-app-studio my-chatgpt-app");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copyToClipboard}
      className="group inline-flex w-fit items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-3 py-1.5 font-mono text-sm transition-all hover:border-border hover:bg-muted/50"
    >
      <span className="text-muted-foreground/70">$</span>
      <span>npx chatgpt-app-studio my-chatgpt-app</span>
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
