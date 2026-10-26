import { cloneElement, type ReactNode } from "react";
import type { DocsLayoutProps } from "fumadocs-ui/layouts/docs";
import type { DocsConfig } from "@farming-labs/docs";
import {
  createDocsLayout as createFrameworkDocsLayout,
  createDocsMetadata as createFrameworkDocsMetadata,
} from "@farming-labs/theme";
import { withThemeDefaults } from "./config";
import { DocsHeader } from "./header";
import { DocsPageContent } from "./page-content";

export const createDocsMetadata = (config: DocsConfig) =>
  createFrameworkDocsMetadata(config);

export const createDocsLayout = (
  config: DocsConfig,
  options: createDocsLayout.Options,
) => {
  const normalized = withThemeDefaults(config);
  const DocsLayout = createFrameworkDocsLayout(
    {
      ...normalized,
      // Farming Labs 0.2 uses the base preset name to label Introduction folders.
      theme: { ...normalized.theme, name: "shadcn" },
    },
    options.locale ? { locale: options.locale } : undefined,
  );
  const docsUrl = config.docsPath ?? `/${config.entry ?? "docs"}`;
  const localizedDocsUrl = options.locale
    ? `${docsUrl}?lang=${encodeURIComponent(options.locale)}`
    : docsUrl;
  const Layout = ({ children }: { children: ReactNode }) => {
    const layout = DocsLayout({
      children: (
        <DocsPageContent
          name={options.name}
          github={config.github}
          editUrl={options.editUrl}
          mcpUrl={options.mcpUrl}
          footer={options.footer}
        >
          {children}
        </DocsPageContent>
      ),
    });
    const layoutProps = options.layoutProps;
    const themedLayout = layoutProps
      ? cloneElement(layout, {
          ...layoutProps,
          sidebar: layoutProps.sidebar
            ? { ...layout.props.sidebar, ...layoutProps.sidebar }
            : layout.props.sidebar,
        })
      : layout;
    return (
      <div className="aui-docs" data-docs-theme="assistant-ui">
        <a className="aui-docs-skip-link" href="#nd-page">
          Skip to content
        </a>
        <DocsHeader
          brand={(config.nav?.title as ReactNode) ?? options.name}
          brandSlot={options.brand}
          homeUrl={
            options.homeUrl ??
            (config.nav?.url && config.nav.url !== docsUrl
              ? config.nav.url
              : localizedDocsUrl)
          }
          docsUrl={localizedDocsUrl}
          name={options.name}
          links={options.links}
          themeToggle={
            config.themeToggle !== false &&
            (typeof config.themeToggle !== "object" ||
              config.themeToggle.enabled !== false)
          }
        />
        {themedLayout}
      </div>
    );
  };
  return Layout;
};

export namespace createDocsLayout {
  export interface Options {
    name: string;
    /** Active locale from the site's Farming Labs i18n configuration. */
    locale?: string;
    /** Custom header branding, including interactive project switchers. */
    brand?: ReactNode;
    /** Framework layout overrides for custom page trees and sidebar slots. */
    layoutProps?: Partial<Omit<DocsLayoutProps, "children">>;
    homeUrl?: string;
    links?: readonly { label: string; href: string; external?: boolean }[];
    footer?: ReactNode;
    mcpUrl?: string;
    /** Override the repository edit link. `{path}` expands to the current page URL path. */
    editUrl?: string;
  }
}
