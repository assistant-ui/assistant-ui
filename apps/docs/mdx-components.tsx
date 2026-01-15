import type { MDXComponents } from "mdx/types";
import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { Callout } from "@/components/docs/callout";
import { Card, Cards } from "@/components/docs/card";
import { Step, Steps } from "@/components/docs/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultComponents from "fumadocs-ui/mdx";
import {
  CodeBlock,
  type CodeBlockProps,
  Pre,
} from "fumadocs-ui/components/codeblock";
import * as Twoslash from "fumadocs-twoslash/ui";

import "fumadocs-twoslash/twoslash.css";

export function getMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    ...Twoslash,
    pre: (props: CodeBlockProps) => (
      <CodeBlock {...props}>
        <Pre className="max-h-[350px]">{props.children}</Pre>
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
    blockquote: (props) => <Callout>{props.children}</Callout>,
    ...components,
  };
}
