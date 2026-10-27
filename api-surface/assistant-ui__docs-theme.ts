import { DocsConfig, DocsTheme } from "@farming-labs/docs";

import { RootProvider } from "@farming-labs/theme";

import { DocsLayoutProps } from "fumadocs-ui/layouts/docs";

import { ReactNode } from "react";

declare const DocsBrand: (_param0: DocsBrand.Props) => import("react").JSX.Element;

declare namespace DocsBrand {
  interface Props {
    name?: string;
  }
}

declare const assistantUi: (overrides?: assistantUi.Options) => DocsTheme;

declare namespace assistantUi {
  interface Options extends Partial<DocsTheme> {
  }
}

declare const createDocsLayout$1: (config: DocsConfig, options: createDocsLayout$1.Options) => (_param1: {
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

export { entry_next_exports as entry_next, entry_provider_exports as entry_provider, entry_root_exports as entry_root };
