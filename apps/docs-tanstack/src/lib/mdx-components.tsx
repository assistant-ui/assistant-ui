import defaultMdxComponents from "fumadocs-ui/mdx";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { Callout } from "fumadocs-ui/components/callout";
import { Card, Cards } from "fumadocs-ui/components/card";
import type { MDXComponents } from "mdx/types";
import { makeStub } from "./stub-component";

// Site components the spike does not port (apps/docs/mdx-components.tsx).
const STUB_NAMES = [
  "AgentSetup",
  "AgentSetupPrompt",
  "ManualSteps",
  "AnchorAlias",
  "PlatformTabs",
  "PlatformOnly",
  "InstallCommand",
  "ParametersTable",
  "PrimitivesTypeTable",
  "SourceLink",
  "DemoIframe",
  "SurfaceGrid",
  "QuickLinks",
  "Quickstart",
  "RuntimeGrid",
  "Flow",
  "MermaidDiagram",
  "TapTutorialSlideshow",
  "ThemeImage",
  "Kbd",
  "StandaloneMode",
  "RuntimeMode",
];

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...Object.fromEntries(STUB_NAMES.map((n) => [n, makeStub(n)])),
    ...defaultMdxComponents,
    Step,
    Steps,
    Tab,
    Tabs,
    Callout,
    Card,
    Cards,
    blockquote: (props: any) => <Callout>{props.children}</Callout>,
    ...components,
  } as MDXComponents;
}
