import { DocsConfig } from "@farming-labs/docs";

import { DocsTheme } from "@farming-labs/docs/config";

import { RootProvider } from "@farming-labs/theme";

import { DocsLayoutProps } from "fumadocs-ui/layouts/docs";

import { ComponentProps, ComponentType, ReactNode } from "react";

declare const DOCS_SIDEBAR_ID = "docs-sidebar";

declare function DocsBody(_param0: ComponentProps<"article">): import("react").JSX.Element;

declare const DocsBrand: (_param1: DocsBrand.Props) => import("react").JSX.Element;

declare namespace DocsBrand {
  interface Props {
    name?: string;
  }
}

declare function DocsContent(_param2: {
  children: ReactNode;
}): ReactNode;

interface DocsFolder extends DocsNodeBase {
  type: "folder";
  name: ReactNode;
  index?: DocsPage;
  children: DocsNode[];
}

declare function DocsFooter(_param3: DocsFooterProps): import("react").JSX.Element | null;

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

declare function DocsPageShell(_param4: {
  toc?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  mainProps?: Omit<ComponentProps<"main">, "children">;
}): import("react").JSX.Element;

declare function DocsPagerNavigation(_param5: {
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

declare function DocsShell(_param6: {
  children: ReactNode;
}): ReactNode;

declare function DocsSidebar(_param7: {
  children: ReactNode;
}): import("react").JSX.Element;

interface DocsSidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

declare function DocsSidebarNavigation(_param8: {
  sections: readonly DocsFolder[];
  pathname: string;
  activeSectionId: string | null;
  isVisible?: (node: DocsNode) => boolean;
  onNavigate: () => void;
  banner?: ReactNode;
  footer?: ReactNode;
  platform?: string;
}): import("react").JSX.Element;

declare function DocsSidebarProvider(_param9: {
  children: ReactNode;
}): import("react").JSX.Element;

declare function DocsSiteHeader(_param10: {
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

declare function DocsTableOfContents(_param11: {
  items: TOCItem[];
  children?: ReactNode;
}): import("react").JSX.Element | null;

type FooterItem = {
  name: ReactNode;
  url: string;
  section?: ReactNode;
};

type TOCItem = {
  title: ReactNode;
  url: string;
  depth: number;
};

declare const assistantUi: (overrides?: assistantUi.Options) => DocsTheme;

declare namespace assistantUi {
  interface Options extends Partial<DocsTheme> {
  }
}

declare const createDocsLayout$1: (config: DocsConfig, options: createDocsLayout$1.Options) => (_param12: {
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

declare const createDocsMetadata$1: (config: DocsConfig) => Record<string, unknown>;

declare namespace entry_root_exports {
  export { DocsBrand, assistantUi };
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

export { entry_next_exports as entry_next, entry_provider_exports as entry_provider, entry_root_exports as entry_root, entry_ui_exports as entry_ui };
