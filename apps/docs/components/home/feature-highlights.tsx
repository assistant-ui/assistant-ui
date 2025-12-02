"use client";

import { cn } from "@/lib/utils";
import { Cpu, PanelsTopLeft, Terminal, Zap } from "lucide-react";

const FEATURE_CARDS = [
  {
    title: "Instant Chat UI",
    description:
      "Drop in a polished ChatGPT-style UX with theming and sensible defaults powered by shadcn/ui and Tailwind.",
    icon: PanelsTopLeft,
    iconClassName: "text-purple-400",
  },
  {
    title: "State Management",
    description:
      "Optimized for streaming responses, interruptions, retries, and multi-turn conversations out of the box.",
    icon: Cpu,
    iconClassName: "text-blue-400",
  },
  {
    title: "High Performance",
    description:
      "Optimized rendering and minimal bundle size keep your app responsive during streaming.",
    icon: Zap,
    iconClassName: "text-green-400",
  },
  {
    title: "Works Everywhere",
    description:
      "Compatible with Vercel AI SDK, LangChain, or any LLM provider. React-based.",
    icon: Terminal,
    iconClassName: "text-orange-400",
  },
] as const;

export function FeatureHighlights() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="font-medium text-3xl tracking-tight">
          Everything you need to ship AI chat
        </h2>
        <p className="text-muted-foreground">
          Production-ready components and state management to build AI chat,
          faster.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURE_CARDS.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex size-12 items-center justify-center rounded-lg border bg-background shadow-sm">
                <Icon className={cn("size-6", feature.iconClassName)} />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-xl tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
