"use client";

import { GenerativeUIRender, type GenerativeUISpec } from "@assistant-ui/react";
import { componentsAllowlist } from "@/components/gui";

const UnknownComponentFallback = ({ component }: { component: string }) => (
  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
    unknown component: {component}
  </span>
);

/**
 * Self-contained demo of the GenerativeUI primitive.
 *
 * Renders a hand-written `GenerativeUISpec` directly via `GenerativeUIRender`,
 * the same renderer that backs `MessagePrimitive.GenerativeUI` when a
 * `generative-ui` part flows through `MessagePrimitive.Parts`.
 *
 * In a real integration the spec arrives as a `generative-ui` message part
 * from the agent; the consumer-provided allowlist is the security boundary.
 */
const exampleSpec: GenerativeUISpec = {
  root: [
    {
      component: "Card",
      props: {
        title: "Welcome",
        description: "An agent-described card with a primary CTA.",
      },
      children: [
        {
          component: "Stack",
          props: { gap: "sm" },
          children: [
            {
              component: "Text",
              children: [
                "This card was rendered from a JSON spec emitted by the agent.",
              ],
            },
            {
              component: "Button",
              props: {
                label: "Get started",
                variant: "primary",
                onClickPrompt: "open onboarding",
              },
            },
          ],
        },
      ],
    },
    {
      component: "Card",
      props: { title: "Stats" },
      children: [
        {
          component: "Stack",
          props: { direction: "row", gap: "md" },
          children: [
            { component: "Stat", props: { label: "Revenue", value: "$124k" } },
            {
              component: "Stat",
              props: { label: "Active Users", value: "8.2k" },
            },
            { component: "Stat", props: { label: "Latency", value: "42ms" } },
          ],
        },
      ],
    },
  ],
};

export default function GenerativeUIPrimitivePage() {
  return (
    <main className="mx-auto flex h-full max-w-2xl flex-col gap-6 p-8">
      <header>
        <h1 className="font-bold text-2xl">MessagePrimitive.GenerativeUI</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Agent-described React UI rendered from a JSON spec via a
          consumer-provided component allowlist.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <GenerativeUIRender
          spec={exampleSpec}
          components={componentsAllowlist}
          Fallback={UnknownComponentFallback}
        />
      </section>
    </main>
  );
}
