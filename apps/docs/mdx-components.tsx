import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { Callout } from "@/components/docs/fumadocs/callout";
import { Card, Cards } from "@/components/docs/fumadocs/card";
import { Step, Steps } from "@/components/docs/fumadocs/steps";
import { Tab, Tabs } from "@/components/docs/fumadocs/tabs";
import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultComponents from "fumadocs-ui/mdx";
import {
  CodeBlock,
  type CodeBlockProps,
  Pre,
} from "fumadocs-ui/components/codeblock";
import * as Twoslash from "fumadocs-twoslash/ui";
import { InstallCommand } from "@/components/docs/fumadocs/install/install-command";
import { ParametersTable } from "@/components/docs/parameters-table";
import { SourceLink } from "@/components/docs/source-link";
import { Code } from "@radix-ui/themes";

import "@/styles/twoslash.css";

function Kbd({ children, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-muted px-1.5 font-mono text-muted-foreground text-xs"
      {...props}
    >
      {children}
    </kbd>
  );
}

export function getMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    ...Twoslash,
    pre: (props: CodeBlockProps) => (
      <CodeBlock {...props}>
        <Pre className="max-h-87.5">{props.children}</Pre>
      </CodeBlock>
    ),
    Tabs,
    Tab,
    Callout,
    Card,
    Cards,
    Step,
    Steps,
    TypeTable,
    Accordion,
    Accordions,
    Kbd,
    InstallCommand,
    ParametersTable,
    SourceLink,
    Code,
    blockquote: (props) => <Callout>{props.children}</Callout>,
    ...components,
  };
}
