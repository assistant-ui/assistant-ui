import type { ComponentProps, ReactNode } from "react";
import type { MDXComponents } from "mdx/types";
import { getMDXComponents } from "@/mdx-components";
import { TabLLM, TabsLLM } from "@/components/pages/docs/fumadocs/tabs.llm";
import {
  PlatformOnlyLLM,
  PlatformTabsLLM,
} from "@/components/pages/docs/platform/mdx.llm";
import type { CalloutProps } from "@/components/ui/callout";
import { CardLLM, CardsLLM } from "@/components/pages/docs/fumadocs/card";
import { InstallCommandLLM } from "@/components/pages/docs/fumadocs/install/install-command";
import { ParametersTableLLM } from "@/components/pages/docs/parameters-table";
import { PrimitivesTypeTableLLM } from "@/components/pages/docs/primitives-type-table";
import { FlowLLM } from "@/components/assistant-ui/flow";
import { TapTutorialSlideshowLLM } from "@/components/pages/docs/tap/tutorial-slideshow.llm";
import {
  QuickLinksLLM,
  QuickstartLLM,
  RuntimeGridLLM,
  SurfaceGridLLM,
} from "@/components/pages/docs/landing/llm";

// Keep the authored fuma type in the `[!type]` marker; GitHub's admonition set
// is smaller, so the type is not remapped.
const CalloutLLM = ({ type = "info", title, children }: CalloutProps) => (
  <blockquote>
    <p>{`[!${type}]`}</p>
    {title ? (
      <p>
        <strong>{title}</strong>
      </p>
    ) : null}
    {children}
  </blockquote>
);

const StepsLLM = ({ children }: { children?: ReactNode }) => (
  <ol>{children}</ol>
);
const StepLLM = ({ children }: { children?: ReactNode }) => <li>{children}</li>;

// fumadocs' client Heading/CodeBlock hit the resolver's client fallback, which
// dumps the `as` prop and inlines code. Plain server elements keep heading
// levels and fenced code.
const Heading =
  (Tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") =>
  ({ children }: ComponentProps<"h1">) => <Tag>{children}</Tag>;

/**
 * The single substitution point mapping MDX components to their text variants
 * for LLM/markdown rendering. `PreviewCode` is the exception: it's imported
 * directly in MDX (it's a `node:fs` server component), so it bypasses this map
 * and carries its variant as a `.llm` marker the resolver picks up instead.
 */
export const LLM_COMPONENTS: MDXComponents = {
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
  Quickstart: QuickstartLLM,
  SurfaceGrid: SurfaceGridLLM,
  RuntimeGrid: RuntimeGridLLM,
  QuickLinks: QuickLinksLLM,
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
  Flow: FlowLLM,
  TapTutorialSlideshow: TapTutorialSlideshowLLM,
};
