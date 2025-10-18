import type { MDXComponents } from "mdx/types";
import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { Callout } from "fumadocs-ui/components/callout";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultComponents from "fumadocs-ui/mdx";
import type React from "react";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { Popup, PopupContent, PopupTrigger } from "fumadocs-twoslash/ui";

import "fumadocs-twoslash/twoslash.css";

type PropsOf<T> = T extends React.ComponentType<infer P> ? P : never;

const PopupMDX = (props: PropsOf<typeof Popup>) => <Popup {...props} />;
const PopupContentMDX = (props: PropsOf<typeof PopupContent>) => (
  <PopupContent {...props} />
);
const PopupTriggerMDX = (props: PropsOf<typeof PopupTrigger>) => (
  <PopupTrigger {...props} />
);
const CalloutMDX = (props: PropsOf<typeof Callout>) => <Callout {...props} />;
const AccordionMDX = (props: PropsOf<typeof Accordion>) => (
  <Accordion {...props} />
);
const AccordionsMDX = (props: PropsOf<typeof Accordions>) => (
  <Accordions {...props} />
);
const TabsMDX = (props: PropsOf<typeof Tabs>) => <Tabs {...props} />;
const TabMDX = (props: PropsOf<typeof Tab>) => <Tab {...props} />;

export function getMDXComponents(components: MDXComponents): MDXComponents {
  const { a: _defaultAnchor, img: _defaultImg, ...defaultWithoutAnchor } = defaultComponents as typeof defaultComponents;
  return {
    ...defaultWithoutAnchor,
    // Map to intrinsic elements to avoid cross-version React type friction
    a: 'a',
    img: 'img',
    Popup: PopupMDX,
    PopupContent: PopupContentMDX,
    PopupTrigger: PopupTriggerMDX,
    pre: (props: unknown) => {
      const { children } = props as { children?: React.ReactNode };
      return (
        <CodeBlock>
          <Pre className="max-h-[400px]">{children}</Pre>
        </CodeBlock>
      );
    },
    Tabs: TabsMDX,
    Tab: TabMDX,
    Callout: CalloutMDX,
    TypeTable,
    Accordion: AccordionMDX,
    Accordions: AccordionsMDX,
    blockquote: (props) => <Callout>{props.children}</Callout>,
    ...components,
  } satisfies MDXComponents;
}
