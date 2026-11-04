import type { DocsConfig } from "@farming-labs/docs/config";

export const sidebarDefaults = {
  collapsible: false,
  flat: true,
  folderIndexBehavior: "link",
} satisfies Exclude<DocsConfig["sidebar"], boolean | undefined>;

export const assistantUiDefaults: Required<
  Pick<DocsConfig, "sidebar" | "breadcrumb" | "lastUpdated" | "pageActions">
> = {
  sidebar: sidebarDefaults,
  breadcrumb: { enabled: false },
  lastUpdated: false,
  pageActions: {
    position: "title",
    variant: "menu",
    pager: true,
    copyMarkdown: { enabled: true },
    viewMarkdown: true,
    openDocs: { enabled: true, providers: ["claude", "codex"] },
    connectMcp: true,
    toc: true,
    askAi: false,
  },
};
