import type { DocsConfig } from "@farming-labs/docs/config";
import { assistantUiMdxComponents } from "./mdx";

export const sidebarDefaults = {
  collapsible: false,
  flat: true,
  folderIndexBehavior: "link",
} satisfies Exclude<DocsConfig["sidebar"], boolean | undefined>;

export const assistantUiDefaults: Required<
  Pick<
    DocsConfig,
    "sidebar" | "breadcrumb" | "lastUpdated" | "pageActions" | "components"
  >
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
    descriptions: true,
    openDocs: {
      enabled: true,
      providers: [
        "claude",
        {
          id: "codex",
          urlTemplate: "https://chatgpt.com/codex/",
          description: "Open Codex in ChatGPT",
        },
      ],
    },
    connectMcp: true,
    toc: true,
    askAi: false,
  },
  components: assistantUiMdxComponents,
};
