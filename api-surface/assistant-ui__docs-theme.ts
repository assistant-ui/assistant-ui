import { DocsConfig, DocsTheme } from "@farming-labs/docs";

import { RootProvider } from "@farming-labs/theme";

import { DocsLayoutProps } from "fumadocs-ui/layouts/docs";

import { ComponentProps, ReactNode } from "react";

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

declare function DocsFooter(_param3: DocsFooterProps): import("react").JSX.Element | null;

type DocsFooterProps = {
  previous?: FooterItem | undefined;
  next?: FooterItem | undefined;
};

declare function DocsPageShell(_param4: {
  toc?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}): import("react").JSX.Element;

declare function DocsShell(_param5: {
  children: ReactNode;
}): ReactNode;

type FooterItem = {
  name: ReactNode;
  url: string;
  section?: ReactNode;
};

declare const assistantUi: (overrides?: assistantUi.Options) => DocsTheme;

declare namespace assistantUi {
  interface Options extends Partial<DocsTheme> {
  }
}

declare const createDocsLayout$1: (config: DocsConfig, options: createDocsLayout$1.Options) => (_param6: {
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
  export { DocsBody, DocsContent, DocsFooter, DocsPageShell, DocsShell };
}

export { entry_next_exports as entry_next, entry_provider_exports as entry_provider, entry_root_exports as entry_root, entry_ui_exports as entry_ui };
