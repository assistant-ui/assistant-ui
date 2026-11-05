import type { ComponentProps } from "react";
import { Callout } from "./callout";
import { CodeGroup, Pre } from "./code-block";
import {
  Card,
  Cards,
  Code,
  Kbd,
  Step,
  Steps,
  Table,
  ThemeImage,
} from "./content";
import { File, Files, Folder, Heading } from "./interactive";
import { Tab, Tabs } from "./tabs";

export { Callout, type CalloutProps, type CalloutType } from "./callout";
export { CodeBlock, CodeGroup, Pre, type CodeBlockProps } from "./code-block";
export {
  Card,
  Cards,
  Code,
  Kbd,
  Step,
  Steps,
  Table,
  ThemeImage,
  type CardProps,
} from "./content";
export { File, Files, Folder, Heading } from "./interactive";
export { Tab, Tabs, type TabProps, type TabsProps } from "./tabs";

/** The MDX components that give docs content the assistant-ui look. */
export const assistantUiMdxComponents = {
  h1: (props: ComponentProps<"h1">) => <Heading as="h1" {...props} />,
  h2: (props: ComponentProps<"h2">) => <Heading as="h2" {...props} />,
  h3: (props: ComponentProps<"h3">) => <Heading as="h3" {...props} />,
  h4: (props: ComponentProps<"h4">) => <Heading as="h4" {...props} />,
  h5: (props: ComponentProps<"h5">) => <Heading as="h5" {...props} />,
  h6: (props: ComponentProps<"h6">) => <Heading as="h6" {...props} />,
  pre: Pre,
  table: Table,
  blockquote: (props: ComponentProps<"blockquote">) => (
    <Callout>{props.children}</Callout>
  ),
  Callout,
  CodeGroup,
  Tabs,
  Tab,
  Steps,
  Step,
  Cards,
  Card,
  Files,
  File,
  Folder,
  Kbd,
  Code,
  ThemeImage,
};
