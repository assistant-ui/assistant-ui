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
    <section className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="font-medium text-3xl tracking-tight">
          Everything you need to ship AI chat
        </h2>
        <p className="text-muted-foreground">
          Production-ready components and state management.
        </p>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
    </section>
  );
}
