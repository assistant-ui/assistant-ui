import type { FC } from "react";
import { Base } from "@/components/examples/base";
import { ChatGPT } from "@/components/examples/chatgpt";
import { Claude } from "@/components/examples/claude";
import { Gemini } from "@/components/examples/gemini";
import { Grok } from "@/components/examples/grok";
import { Perplexity } from "@/components/examples/perplexity";
import { DEMO_META, type DemoMeta } from "./demos-meta";

export type DemoEntry = DemoMeta & { component: FC };

const DEMO_COMPONENTS: Record<string, FC> = {
  base: Base,
  chatgpt: ChatGPT,
  claude: Claude,
  gemini: Gemini,
  grok: Grok,
  perplexity: Perplexity,
};

export const DEMOS: DemoEntry[] = DEMO_META.flatMap((meta) => {
  const component = DEMO_COMPONENTS[meta.slug];
  return component ? [{ ...meta, component }] : [];
});

export function getDemo(slug: string): DemoEntry | undefined {
  return DEMOS.find((demo) => demo.slug === slug);
}
