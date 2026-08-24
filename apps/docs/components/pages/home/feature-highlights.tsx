import { typeDeck, typeSection } from "@/components/shared/type";

const FEATURES = [
  {
    title: "Instant Chat UI",
    description: "Drop in ChatGPT-style UX with theming and sensible defaults.",
  },
  {
    title: "State Management",
    description:
      "Streaming, interruptions, retries, and multi-turn conversations.",
  },
  {
    title: "High Performance",
    description:
      "Optimized rendering and minimal bundle size for responsive streaming.",
  },
  {
    title: "Works Everywhere",
    description: "Vercel AI SDK, LangChain, or any LLM provider. React-based.",
  },
] as const;

export function FeatureHighlights() {
  return (
    <section className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h2 className={typeSection}>Everything you need to ship AI chat</h2>
        <p className={typeDeck}>
          Production-ready components and state management.
        </p>
      </div>

      <dl className="grid gap-x-16 gap-y-10 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="flex flex-col gap-1.5">
            <dt className="text-[15px] font-medium">{feature.title}</dt>
            <dd className="text-muted-foreground text-sm leading-relaxed text-pretty">
              {feature.description}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
