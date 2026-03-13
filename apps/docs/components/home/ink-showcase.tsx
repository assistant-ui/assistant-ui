"use client";

import { ArrowRight, Code2, Layers, Terminal } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TerminalDemo } from "@/app/ink/terminal-demo";
import "@/app/ink/terminal-mockup.css";

// ── Features ───────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Terminal,
    color: "text-emerald-400",
    title: "Built for Ink",
    desc: "React component model + ANSI colors, layouts, and full terminal control.",
  },
  {
    icon: Code2,
    color: "text-violet-400",
    title: "Markdown in the terminal",
    desc: "Rich rendering — headings, code blocks, lists — as ANSI output.",
  },
  {
    icon: Layers,
    color: "text-cyan-400",
    title: "Share your runtime",
    desc: "Same tools and adapters from web, mobile, and terminal.",
  },
] as const;

// ── Main section ──────────────────────────────────────────────────────────

export function InkShowcase() {
  return (
    <section className="grid items-center gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
      {/* Left: text + features + CTA + install */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-widest">
            Ink / Terminal
          </p>
          <h2 className="font-medium text-3xl tracking-tight">
            AI chat for the terminal
          </h2>
          <p className="max-w-md text-muted-foreground">
            Beautiful, streaming AI chat experiences built with{" "}
            <a
              href="https://github.com/vadimdemedes/ink"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 transition-colors hover:text-foreground"
            >
              Ink
            </a>
            . Powered by the same runtime as assistant-ui — with rich markdown
            rendering and full tool call support.
          </p>
        </div>

        <ul className="flex flex-col gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <li key={f.title} className="flex items-start gap-3">
                <Icon className={cn("mt-0.5 size-4 shrink-0", f.color)} />
                <div>
                  <p className="font-medium text-sm">{f.title}</p>
                  <p className="text-muted-foreground text-sm">{f.desc}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/ink" className={buttonVariants({ size: "sm" })}>
              Explore Ink <ArrowRight className="size-3.5" />
            </Link>
            <Link
              href="/docs/ink"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Docs
            </Link>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 font-mono text-muted-foreground text-xs">
            <span className="opacity-50">$</span>
            <span>npx assistant-ui@latest create --ink my-app</span>
          </div>
        </div>
      </div>

      {/* Right: terminal demo */}
      <div className="min-w-0">
        <TerminalDemo />
      </div>
    </section>
  );
}
