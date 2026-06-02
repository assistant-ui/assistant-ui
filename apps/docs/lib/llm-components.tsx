import type { ComponentProps } from "react";
import type { MDXComponents } from "mdx/types";
import { getMDXComponents } from "@/mdx-components";
import { TabLLM, TabsLLM } from "@/components/docs/fumadocs/tabs.llm";
import {
  PlatformOnlyLLM,
  PlatformTabsLLM,
} from "@/components/docs/platform/mdx.llm";
import { CalloutLLM } from "@/components/docs/fumadocs/callout";
import { CardLLM, CardsLLM } from "@/components/docs/fumadocs/card";
import { StepLLM, StepsLLM } from "@/components/docs/fumadocs/steps";
import { InstallCommandLLM } from "@/components/docs/fumadocs/install/install-command";
import { ParametersTableLLM } from "@/components/docs/parameters-table";
import { PrimitivesTypeTableLLM } from "@/components/docs/primitives-type-table";

/**
 * The single substitution point mapping MDX components to their text variants
 * for LLM/markdown rendering. `PreviewCode` is the exception: it's imported
 * directly in MDX (it's a `node:fs` server component), so it bypasses this map
 * and carries its variant as a `.llm` marker the resolver picks up instead.
 */
// fumadocs' client Heading/CodeBlock hit the resolver's client fallback, which
// dumps the `as` prop and inlines code. Plain server elements keep heading
// levels and fenced code.
const Heading =
  (Tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") =>
  ({ children }: ComponentProps<"h1">) => <Tag>{children}</Tag>;

const LLM_COMPONENTS: MDXComponents = {
  ...getMDXComponents({}),
  h1: Heading("h1"),
  h2: Heading("h2"),
  h3: Heading("h3"),
  h4: Heading("h4"),
  h5: Heading("h5"),
  h6: Heading("h6"),
  pre: ({ children }: ComponentProps<"pre">) => <pre>{children}</pre>,
  // Static markdown images render via next/image (client), whose fallback drops
  // src and leaks alt. A host <img> survives as `![alt](src)`; src may be a
  // string or a StaticImageData object.
  img: ({ src, alt }: ComponentProps<"img">) => {
    const value = src as string | { src?: string } | undefined;
    const url = typeof value === "string" ? value : value?.src;
    return url ? <img src={url} alt={alt ?? ""} /> : null;
  },
  // The base map turns every blockquote into a Callout; keep plain quotes plain
  // and reserve `[!type]` for real Callouts.
  blockquote: ({ children }: ComponentProps<"blockquote">) => (
    <blockquote>{children}</blockquote>
  ),
  Callout: CalloutLLM,
  Tabs: TabsLLM,
  Tab: TabLLM,
  PlatformTabs: PlatformTabsLLM,
  PlatformOnly: PlatformOnlyLLM,
  Cards: CardsLLM,
  Card: CardLLM,
  Steps: StepsLLM,
  Step: StepLLM,
  InstallCommand: InstallCommandLLM,
  ParametersTable: ParametersTableLLM,
  PrimitivesTypeTable: PrimitivesTypeTableLLM,
};

export function getLLMComponents(): MDXComponents {
  return LLM_COMPONENTS;
}
