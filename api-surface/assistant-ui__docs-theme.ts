import { DocsConfig as DocsConfig$1 } from "@farming-labs/docs";

import { DocsConfig, DocsTheme } from "@farming-labs/docs/config";

import { RootProvider } from "@farming-labs/theme";

import { DocsLayoutProps } from "fumadocs-ui/layouts/docs";

import { ComponentProps, ComponentType, ReactNode } from "react";

declare function Callout(_param0: CalloutProps): import("react").JSX.Element;

interface CalloutProps extends Omit<ComponentProps<"div">, "title"> {
  type?: CalloutType;
  title?: ReactNode;
}

type CalloutType = "error" | "idea" | "info" | "note" | "success" | "tip" | "warn" | "warning";

declare function Card(_param1: CardProps): import("react").JSX.Element;

interface CardProps {
  title: ReactNode;
  description?: string;
  href?: string;
  icon?: ReactNode;
  external?: boolean;
  children?: ReactNode;
}

declare function Cards(_param2: ComponentProps<"div">): import("react").JSX.Element;

declare function Code(_param3: ComponentProps<"code">): import("react").JSX.Element;

declare function CodeBlock(_param4: CodeBlockProps): import("react").JSX.Element;

interface CodeBlockProps extends Omit<ComponentProps<"figure">, "title"> {
  title?: ReactNode;
  copyText?: string;
}

declare function CodeGroup(_param5: Omit<ComponentProps<"figure">, "title">): import("react").JSX.Element | null;

declare const DOCS_SIDEBAR_ID = "docs-sidebar";

declare function DocsBody(_param6: ComponentProps<"article">): import("react").JSX.Element;

declare const DocsBrand: (_param7: DocsBrand.Props) => import("react").JSX.Element;

declare namespace DocsBrand {
  interface Props {
    name?: string;
  }
}

declare function DocsContent(_param8: {
  children: ReactNode;
}): ReactNode;

interface DocsFolder extends DocsNodeBase {
  type: "folder";
  name: ReactNode;
  index?: DocsPage;
  children: DocsNode[];
}

declare function DocsFooter(_param9: DocsFooterProps): import("react").JSX.Element | null;

type DocsFooterProps = {
  previous?: FooterItem | undefined;
  next?: FooterItem | undefined;
};

type DocsNode = DocsPage | DocsFolder | DocsSeparator;

interface DocsNodeBase {
  $id?: string;
  name?: ReactNode;
  icon?: ReactNode;
}

interface DocsPage extends DocsNodeBase {
  type: "page";
  name: ReactNode;
  url: string;
}

declare function DocsPageShell(_param10: {
  toc?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  mainProps?: Omit<ComponentProps<"main">, "children">;
}): import("react").JSX.Element;

declare function DocsPagerNavigation(_param11: {
  previous?: {
    url: string;
    name?: ReactNode;
  } | undefined;
  next?: {
    url: string;
    name?: ReactNode;
  } | undefined;
  children?: ReactNode;
}): import("react").JSX.Element;

interface DocsSeparator extends DocsNodeBase {
  type: "separator";
}

declare function DocsShell(_param12: {
  children: ReactNode;
}): ReactNode;

declare function DocsSidebar(_param13: {
  children: ReactNode;
}): import("react").JSX.Element;

interface DocsSidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

declare function DocsSidebarNavigation(_param14: {
  sections: readonly DocsFolder[];
  pathname: string;
  activeSectionId: string | null;
  isVisible?: (node: DocsNode) => boolean;
  onNavigate: () => void;
  banner?: ReactNode;
  footer?: ReactNode;
  platform?: string;
}): import("react").JSX.Element;

declare function DocsSidebarProvider(_param15: {
  children: ReactNode;
}): import("react").JSX.Element;

declare function DocsSiteHeader(_param16: {
  brand: ReactNode;
  mobileControls: ReactNode;
  condensedNavigation: ReactNode;
  desktopNavigation: ReactNode;
  mobileNavigation: (close: () => void) => ReactNode;
  navigationRoot: ComponentType<{
    children: ReactNode;
  }>;
  scrolled: boolean;
}): import("react").JSX.Element;

declare function DocsTableOfContents(_param17: {
  items: TOCItem[];
  children?: ReactNode;
}): import("react").JSX.Element | null;

declare function File(_param18: ComponentProps<"div"> & {
  name: ReactNode;
  icon?: ReactNode;
}): import("react").JSX.Element;

declare function Files(_param19: ComponentProps<"div">): import("react").JSX.Element;

declare function Folder(_param20: ComponentProps<"div"> & {
  name: ReactNode;
  defaultOpen?: boolean;
}): import("react").JSX.Element;

type FooterItem = {
  name: ReactNode;
  url: string;
  section?: ReactNode;
};

declare function Heading(_param21: ComponentProps<"h1"> & {
  as?: HeadingTag;
}): import("react").JSX.Element;

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

declare function Kbd(_param22: ComponentProps<"kbd">): import("react").JSX.Element;

declare function Pre(_param23: PreProps): import("react").JSX.Element;

type PreProps = ComponentProps<"pre"> & {
  title?: ReactNode;
  icon?: ReactNode;
};

declare function Step(_param24: ComponentProps<"div">): import("react").JSX.Element;

declare function Steps(_param25: ComponentProps<"div">): import("react").JSX.Element;

type TOCItem = {
  title: ReactNode;
  url: string;
  depth: number;
};

declare function Tab(_param26: TabProps): import("react").JSX.Element;

interface TabProps extends ComponentProps<"div"> {
  value?: string;
}

declare function Table(_param27: ComponentProps<"table">): import("react").JSX.Element;

declare function Tabs(_param28: TabsProps): import("react").JSX.Element;

interface TabsProps extends ComponentProps<"div"> {
  items?: string[];
  defaultIndex?: number;
  label?: ReactNode;
}

declare function ThemeImage(_param29: Omit<ComponentProps<"img">, "src"> & {
  light: string;
  dark: string;
}): import("react").JSX.Element;

declare const assistantUi: (overrides?: assistantUi.Options) => DocsTheme;

declare namespace assistantUi {
  interface Options extends Partial<DocsTheme> {
  }
}

declare const assistantUiDefaults: Required<Pick<DocsConfig, "breadcrumb" | "components" | "lastUpdated" | "pageActions" | "sidebar">>;

declare const assistantUiMdxComponents: {
  h1: (props: ComponentProps<"h1">) => import("react").JSX.Element;
  h2: (props: ComponentProps<"h2">) => import("react").JSX.Element;
  h3: (props: ComponentProps<"h3">) => import("react").JSX.Element;
  h4: (props: ComponentProps<"h4">) => import("react").JSX.Element;
  h5: (props: ComponentProps<"h5">) => import("react").JSX.Element;
  h6: (props: ComponentProps<"h6">) => import("react").JSX.Element;
  pre: typeof Pre;
  table: typeof Table;
  blockquote: (props: ComponentProps<"blockquote">) => import("react").JSX.Element;
  Callout: typeof Callout;
  CodeGroup: typeof CodeGroup;
  Tabs: typeof Tabs;
  Tab: typeof Tab;
  Steps: typeof Steps;
  Step: typeof Step;
  Cards: typeof Cards;
  Card: typeof Card;
  Files: typeof Files;
  File: typeof File;
  Folder: typeof Folder;
  Kbd: typeof Kbd;
  Code: typeof Code;
  ThemeImage: typeof ThemeImage;
};

declare const createDocsLayout$1: (config: DocsConfig$1, options: createDocsLayout$1.Options) => (_param30: {
  children: ReactNode;
}) => import("react").JSX.Element;

declare namespace createDocsLayout$1 {
  interface Options {
    name: string;
    locale?: string;
    brand?: ReactNode;
    layoutProps?: Partial<Omit<DocsLayoutProps, "children">>;
    homeUrl?: string;
    links?: readonly {
      label: string;
      href: string;
      external?: boolean;
    }[];
    footer?: ReactNode;
    mcpUrl?: string;
    editUrl?: string;
  }
}

declare const createDocsMetadata$1: (config: DocsConfig$1) => Record<string, unknown>;

declare namespace entry_mdx_exports {
  export { Callout, CalloutProps, CalloutType, Card, CardProps, Cards, Code, CodeBlock, CodeBlockProps, CodeGroup, File, Files, Folder, Heading, Kbd, Pre, Step, Steps, Tab, TabProps, Table, Tabs, TabsProps, ThemeImage, assistantUiMdxComponents };
}

declare namespace entry_root_exports {
  export { DocsBrand, assistantUi, assistantUiDefaults };
}

declare namespace entry_next_exports {
  export { createDocsLayout$1 as createDocsLayout, createDocsMetadata$1 as createDocsMetadata };
}

declare namespace entry_provider_exports {
  export { RootProvider };
}

declare namespace entry_ui_exports {
  export { DOCS_SIDEBAR_ID, DocsBody, DocsContent, DocsFolder, DocsFooter, DocsNode, DocsPage, DocsPageShell, DocsPagerNavigation, DocsSeparator, DocsShell, DocsSidebar, DocsSidebarNavigation, DocsSidebarProvider, DocsSiteHeader, DocsTableOfContents, useDocsSidebar };
}

declare function useDocsSidebar(): DocsSidebarContextValue;

export { entry_mdx_exports as entry_mdx, entry_next_exports as entry_next, entry_provider_exports as entry_provider, entry_root_exports as entry_root, entry_ui_exports as entry_ui };
