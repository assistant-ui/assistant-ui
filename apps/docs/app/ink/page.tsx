"use client";

import {
  ArrowRight,
  Code2,
  Layers,
  RefreshCw,
  Terminal,
  Wrench,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CopyCommandButton } from "@/components/home/copy-command-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { TerminalDemo } from "./terminal-demo";

import "./terminal-mockup.css";

const ANALYTICS_PAGE = "ink" as const;

const INSTALL_COMMAND = "npx assistant-ui@latest create --ink my-app";

const FEATURES = [
  {
    title: "Built for Ink",
    description:
      "First-class Ink support. Use React's component model to build beautiful terminal UIs with full ANSI color and layout support.",
    icon: Terminal,
    iconColor: "text-green-400",
  },
  {
    title: "Markdown in the Terminal",
    description:
      "Rich markdown rendering with syntax highlighting, tables, and links — all rendered as ANSI output via @assistant-ui/react-ink-markdown.",
    icon: Zap,
    iconColor: "text-yellow-400",
  },
  {
    title: "Battle-Tested Runtime",
    description:
      "Powered by the same engine and runtime system behind assistant-ui.com, refined over two years of production use.",
    icon: RefreshCw,
    iconColor: "text-blue-400",
  },
  {
    title: "Tool Call Support",
    description:
      "Register tools with execute functions and terminal-native UI renderers. Built-in ToolFallback component with expandable output and spinners.",
    icon: Wrench,
    iconColor: "text-purple-400",
  },
  {
    title: "Share Your Runtime Code",
    description:
      "Already using assistant-ui on the web or mobile? Reuse the same runtime, tools, and adapters in your terminal app.",
    icon: Code2,
    iconColor: "text-cyan-400",
  },
  {
    title: "Composable Primitives",
    description:
      "Unstyled, composable primitives — Thread, Composer, Message, and more — designed for terminal UIs from the ground up.",
    icon: Layers,
    iconColor: "text-orange-400",
  },
] as const;

export default function InkPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 pt-14 pb-8 md:space-y-20">
      {/* Hero */}
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="mx-auto max-w-2xl text-3xl font-medium tracking-tight md:text-5xl">
            Build AI chat apps for the terminal
          </h1>
          <p className="text-muted-foreground mx-auto max-w-xl text-lg">
            Beautiful, production-ready AI chat for the terminal. Powered by the
            same runtime as assistant-ui, with rich markdown rendering and
            cross-platform code sharing.
          </p>
        </div>

        <CopyCommandButton
          command={INSTALL_COMMAND}
          analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
        />

        <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-[13px]">
          <Link
            href="/docs/ink"
            className="text-foreground/60 hover:text-foreground font-medium transition-colors"
          >
            Getting Started →
          </Link>
          <span className="bg-muted-foreground/20 hidden size-1 rounded-full sm:block" />
          <Link
            href="/docs/ink/migration"
            className="text-foreground/60 hover:text-foreground font-medium transition-colors"
          >
            Migration from Web →
          </Link>
        </div>
      </div>

      {/* Terminal mockup */}
      <TerminalDemo />

      {/* Features */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-3xl font-medium tracking-tight">
            Why assistant-ui for the Terminal?
          </h2>
          <p className="text-muted-foreground max-w-xl">
            Everything you need to build a world-class AI chat experience in the
            terminal — without starting from scratch.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="border-border/50 bg-muted/30 hover:border-border/80 flex flex-col gap-2 rounded-xl border p-4 transition-colors"
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

      {/* Code sharing callout */}
      <div className="border-border/50 bg-muted/30 mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-xl border p-8 text-center">
        <Code2 className="size-8 text-emerald-400" />
        <h3 className="text-xl font-medium tracking-tight">
          Already using assistant-ui?
        </h3>
        <p className="text-muted-foreground max-w-lg">
          Your existing runtime setup, tool definitions, and model adapters work
          with the React Ink package. Share the same code between your web,
          mobile, and terminal apps — only the UI layer changes.
        </p>
        <Button variant="outline" asChild>
          <Link href="/docs/ink/migration">
            See the migration guide <ArrowRight />
          </Link>
        </Button>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <p className="text-2xl font-medium tracking-tight">
          Start building today
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/docs/ink">
              Get Started <ArrowRight />
            </Link>
          </Button>
          <Link
            href="/docs/ink/migration"
            className={buttonVariants({ variant: "outline" })}
          >
            Migration Guide
          </Link>
        </div>
      </div>
    </div>
  );
}
