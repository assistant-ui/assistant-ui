import {
  defineDocs as defineFarmingDocs,
  type DocsConfig,
} from "@farming-labs/docs/config";
import { assistantUiDefaults, sidebarDefaults } from "./defaults";
import { assistantUi } from "./index";

export const withThemeDefaults = (options: DocsConfig): DocsConfig =>
  defineFarmingDocs({
    ...options,
    theme: options.theme ?? assistantUi(),
    sidebar:
      options.sidebar === false
        ? false
        : {
            ...sidebarDefaults,
            ...(typeof options.sidebar === "object" ? options.sidebar : {}),
          },
    breadcrumb: options.breadcrumb ?? assistantUiDefaults.breadcrumb,
    lastUpdated: options.lastUpdated ?? assistantUiDefaults.lastUpdated,
    pageActions: {
      copyMarkdown: false,
      openDocs: false,
      viewMarkdown: false,
      connectMcp: false,
      toc: false,
      pager: false,
    },
  });
