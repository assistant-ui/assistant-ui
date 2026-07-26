import type { ReactNode } from "react";
import {
  Flavored as FlavoredClient,
  FlavorSwitcher as FlavorSwitcherClient,
} from "@/components/docs/contexts/flavor";
import type { LLMRenderContext } from "@/lib/get-llm-text";

type FlavoredProps = { radix: ReactNode; base: ReactNode };

export function Flavored(props: FlavoredProps) {
  return <FlavoredClient {...props} />;
}

(
  Flavored as typeof Flavored & {
    llm: (props: FlavoredProps, ctx?: LLMRenderContext) => ReactNode;
  }
).llm = ({ radix, base }, ctx) => (ctx?.flavor === "radix" ? radix : base);

export function FlavorSwitcher(props: { className?: string }) {
  return <FlavorSwitcherClient {...props} />;
}

(FlavorSwitcher as typeof FlavorSwitcher & { llm: () => ReactNode }).llm = () =>
  null;
