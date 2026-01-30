import posthog from "posthog-js";
import { track as vercelTrack } from "@vercel/analytics";

declare global {
  interface Window {
    umami?: {
      track: (
        event: string,
        data?: Record<string, string | number | boolean>,
      ) => void;
    };
  }
}

const trackEvent = (
  event: string,
  properties?: Record<string, string | number | boolean>,
) => {
  // PostHog
  posthog.capture?.(event, properties);

  // Vercel Analytics
  vercelTrack(event, properties);

  // Umami
  if (typeof window !== "undefined") {
    window.umami?.track(event, properties);
  }
};

export const analytics = {
  cta: {
    clicked: (cta: "get_started" | "contact_sales", location: string) =>
      trackEvent("cta_clicked", { cta, location }),

    npmCommandCopied: (command = "npx assistant-ui init") =>
      trackEvent("npm_command_copied", { command }),
  },

  search: {
    opened: (source: "header" | "sidebar" | "keyboard") =>
      trackEvent("search_opened", { source }),

    querySubmitted: (query: string, resultsCount: number) =>
      trackEvent("search_query_submitted", {
        query,
        results_count: resultsCount,
      }),

    resultClicked: (query: string, url: string, position: number) =>
      trackEvent("search_result_clicked", { query, url, position }),

    noResults: (query: string) => trackEvent("search_no_results", { query }),
  },

  code: {
    blockCopied: (language: string, source: string) =>
      trackEvent("code_block_copied", { language, source }),
  },

  example: {
    tabSwitched: (example: string) =>
      trackEvent("example_tab_switched", { example }),
  },

  docs: {
    navigationClicked: (pageName: string, pageUrl: string, depth: number) =>
      trackEvent("doc_navigation_clicked", {
        page_name: pageName,
        page_url: pageUrl,
        depth,
      }),

    folderToggled: (folderName: string, isOpen: boolean, depth: number) =>
      trackEvent("doc_folder_toggled", {
        folder_name: folderName,
        is_open: isOpen,
        depth,
      }),
  },

  builder: {
    presetSelected: (preset: string) =>
      trackEvent("builder_preset_selected", { preset }),

    createDialogOpened: () => trackEvent("builder_create_dialog_opened"),

    commandCopied: (
      commandType: "init" | "shadcn" | "manual_init" | "manual_add",
    ) => trackEvent("builder_command_copied", { command_type: commandType }),

    codeCopied: () => trackEvent("builder_code_copied"),

    shareClicked: () => trackEvent("builder_share_clicked"),
  },

  toc: {
    linkClicked: (headingTitle: string, headingDepth: number) =>
      trackEvent("toc_link_clicked", {
        heading_title: headingTitle,
        heading_depth: headingDepth,
      }),

    actionClicked: (action: "copy" | "markdown" | "github" | "ask_ai") =>
      trackEvent("toc_action_clicked", { action }),
  },

  install: {
    packageManagerSelected: (pm: string) =>
      trackEvent("package_manager_selected", { package_manager: pm }),
  },
};
