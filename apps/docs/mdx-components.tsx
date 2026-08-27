import type { MDXComponents } from "mdx/types";
import type { CSSProperties, ComponentProps, ReactNode } from "react";
import { Callout } from "@/components/ui/callout";
import { CodeBlock } from "@/components/ui/code-block";
import { Card, Cards } from "@/components/pages/docs/fumadocs/card";
import { Step, Steps } from "@/components/ui/steps";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tab, Tabs } from "@/components/pages/docs/fumadocs/tabs";
import defaultComponents from "fumadocs-ui/mdx";
import { InstallCommand } from "@/components/pages/docs/fumadocs/install/install-command";
import { ParametersTable } from "@/components/pages/docs/parameters-table";
import {
  PlatformAwareCode,
  PlatformOnly,
  PlatformTabs,
} from "@/components/pages/docs/platform/mdx";
import { PrimitivesTypeTable } from "@/components/pages/docs/primitives-type-table";
import { SourceLink } from "@/components/pages/docs/source-link";
import { DemoIframe } from "@/components/pages/docs/demo-iframe";
import { QuickLinks } from "@/components/pages/docs/landing/quick-links";
import { Quickstart } from "@/components/pages/docs/landing/quickstart";
import { RuntimeGrid } from "@/components/pages/docs/landing/runtime-grid";
import { SurfaceGrid } from "@/components/pages/docs/landing/surface-grid";
import { Flow } from "@/components/assistant-ui/flow";
import { MermaidDiagram } from "@/components/pages/docs/mermaid-diagram";
import { TapTutorialSlideshow } from "@/components/pages/docs/tap/tutorial-slideshow";

function Kbd({ children, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className="bg-muted text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1.5 font-mono text-xs"
      {...props}
    >
      {children}
    </kbd>
  );
}

function Code({ children, ...props }: ComponentProps<"code">) {
  return (
    <code
      className="bg-muted rounded-md px-1.5 py-0.5 font-mono text-[0.85em] font-medium"
      {...props}
    >
      {children}
    </code>
  );
}

export function getMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...(defaultComponents as MDXComponents),
    pre: ({
      title,
      icon: _icon,
      style,
      children,
      ...rest
    }: ComponentProps<"pre"> & { title?: ReactNode; icon?: ReactNode }) => {
      const { backgroundColor: _backgroundColor, ...preStyle } = (style ??
        {}) as CSSProperties;
      return (
        <CodeBlock title={title} viewportClassName="max-h-87.5">
          <pre style={preStyle} {...rest}>
            <PlatformAwareCode>{children}</PlatformAwareCode>
          </pre>
        </CodeBlock>
      );
    },
    table: (props: ComponentProps<"table">) => (
      <div className="my-6">
        <Table {...props} />
      </div>
    ),
    thead: TableHeader,
    tbody: TableBody,
    tfoot: TableFooter,
    tr: TableRow,
    th: TableHead,
    td: TableCell,
    Tabs,
    Tab,
    PlatformTabs,
    Callout,
    Card,
    Cards,
    Step,
    Steps,
    Kbd,
    PlatformOnly,
    InstallCommand,
    ParametersTable,
    PrimitivesTypeTable,
    SourceLink,
    DemoIframe,
    SurfaceGrid,
    QuickLinks,
    Quickstart,
    RuntimeGrid,
    Flow,
    MermaidDiagram,
    TapTutorialSlideshow,
    Code,
    blockquote: (props) => <Callout>{props.children}</Callout>,
    ...components,
  };
}
