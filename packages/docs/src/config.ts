import {
  defineDocs as defineFarmingDocs,
  type DocsConfig,
} from "@farming-labs/docs";
import { assistantUi } from "./index";

export const withThemeDefaults = (options: DocsConfig): DocsConfig =>
  defineFarmingDocs({
    ...options,
    theme: options.theme ?? assistantUi(),
    sidebar:
      options.sidebar === false
        ? false
        : {
            collapsible: false,
            flat: true,
            folderIndexBehavior: "link",
            ...(typeof options.sidebar === "object" ? options.sidebar : {}),
          },
    breadcrumb: options.breadcrumb ?? { enabled: false },
    lastUpdated: options.lastUpdated ?? false,
    pageActions: { copyMarkdown: false, openDocs: false },
  });
