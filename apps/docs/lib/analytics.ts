import posthog from "posthog-js";

export const analytics = {
  // Conversion events
  ctaClicked: (cta: "get_started" | "contact_sales", location: string) =>
    posthog.capture("cta_clicked", { cta, location }),

  npmCommandCopied: () =>
    posthog.capture("npm_command_copied", { command: "npx assistant-ui init" }),

  // Search events
  searchOpened: (source: "header" | "sidebar" | "keyboard") =>
    posthog.capture("search_opened", { source }),

  searchQuerySubmitted: (query: string, resultsCount: number) =>
    posthog.capture("search_query_submitted", {
      query,
      results_count: resultsCount,
    }),

  searchResultClicked: (query: string, url: string, position: number) =>
    posthog.capture("search_result_clicked", { query, url, position }),

  searchNoResults: (query: string) =>
    posthog.capture("search_no_results", { query }),

  // Code events
  codeBlockCopied: (language: string, source: string) =>
    posthog.capture("code_block_copied", { language, source }),
};
