import { Cpu, PanelsTopLeft, Terminal, Zap } from "lucide-react";

const FEATURES = [
  {
    title: "Instant Chat UI",
    description: "Drop in ChatGPT-style UX with theming and sensible defaults.",
    icon: PanelsTopLeft,
  },
  {
    title: "State Management",
    description:
      "Streaming, interruptions, retries, and multi-turn conversations.",
    icon: Cpu,
  },
  {
    title: "High Performance",
    description:
      "Optimized rendering and minimal bundle size for responsive streaming.",
    icon: Zap,
  },
  {
    title: "Works Everywhere",
    description: "Vercel AI SDK, LangChain, or any LLM provider. React-based.",
    icon: Terminal,
  },
] as const;

export function FeatureHighlights() {
  return (
    <section className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h2 className="max-w-[40ch] text-3xl font-semibold tracking-tight text-balance">
          Everything you need to ship AI chat
        </h2>
        <p className="text-muted-foreground max-w-[48ch] text-pretty">
          Production-ready components and state management.
        </p>
      </div>

      <dl className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="flex flex-col gap-4">
              <div className="bg-muted/30 flex size-10 items-center justify-center rounded-lg border">
                <Icon className="text-muted-foreground size-5" />
              </div>
              <div className="flex flex-col gap-1.5">
                <dt className="font-medium">{feature.title}</dt>
                <dd className="text-muted-foreground text-sm leading-relaxed text-pretty">
                  {feature.description}
                </dd>
              </div>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
