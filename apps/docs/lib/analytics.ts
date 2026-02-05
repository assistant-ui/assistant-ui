declare global {
  interface Window {
    posthog?: {
      capture?: (
        event: string,
        properties?: Record<string, string | number | boolean>,
      ) => void;
    };
    umami?: {
      track: (
        event: string,
        data?: Record<string, string | number | boolean>,
      ) => void;
    };
  }
}

let vercelTrackPromise:
  | Promise<
      | ((
          event: string,
          properties?: Record<string, string | number | boolean>,
        ) => void)
      | null
    >
  | undefined;

const getVercelTrack = () => {
  if (vercelTrackPromise) return vercelTrackPromise;
  vercelTrackPromise = import("@vercel/analytics")
    .then(({ track }) => track)
    .catch(() => null);
  return vercelTrackPromise;
};

const trackEvent = (
  event: string,
  properties?: Record<string, string | number | boolean>,
) => {
  // PostHog
  if (typeof window !== "undefined") {
    window.posthog?.capture?.(event, properties);
  }

  // Vercel Analytics
  if (typeof window !== "undefined") {
    void getVercelTrack().then((track) => track?.(event, properties));
  }

  // Umami
  if (typeof window !== "undefined") {
    window.umami?.track(event, properties);
  }
};

export const analytics = {
  cta: {
    clicked: (cta: "get_started" | "contact_sales", location: string) =>
      trackEvent("cta_clicked", { cta, location }),

    npmCommandCopied: (
      command = "npx assistant-ui init",
      properties?: Record<string, string | number | boolean>,
    ) => trackEvent("npm_command_copied", { ...properties, command }),
  },

  outbound: {
    linkClicked: (
      href: string,
      label: string,
      properties?: Record<string, string | number | boolean>,
    ) => trackEvent("outbound_link_clicked", { ...properties, href, label }),
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

  mcpAppStudio: {
    sectionViewed: (section: string) =>
      trackEvent("mcp_app_studio_section_viewed", { section }),

    workbenchFullscreenToggled: (open: boolean) =>
      trackEvent("mcp_app_studio_workbench_fullscreen_toggled", { open }),

    workbenchIframeLoaded: (
      variant: "inline" | "fullscreen",
      elapsedMs?: number,
    ) =>
      trackEvent("mcp_app_studio_workbench_iframe_loaded", {
        variant,
        ...(elapsedMs === undefined ? {} : { elapsed_ms: elapsedMs }),
      }),

    workbenchIframeFailed: (
      variant: "inline" | "fullscreen",
      elapsedMs?: number,
    ) =>
      trackEvent("mcp_app_studio_workbench_iframe_failed", {
        variant,
        ...(elapsedMs === undefined ? {} : { elapsed_ms: elapsedMs }),
      }),
  },

  assistant: {
    panelToggled: (props: { open: boolean; source: "trigger" | "toggle" }) => {
      trackEvent("assistant_panel_toggled", props);
    },

    messageSent: (props: {
      threadId: string;
      messageId?: string;
      source: "composer" | "ask_ai";
      message_length: number;
      attachments_count: number;
      pathname?: string;
      model_name?: string;
    }) => {
      trackEvent("assistant_message_sent", props);
    },

    responseCompleted: (props: {
      threadId: string;
      latency_ms?: number;
      status_reason?: string;
      response_length: number;
      tool_calls_count: number;
      response_total_tokens?: number;
      response_input_tokens?: number;
      response_output_tokens?: number;
      pathname?: string;
      model_name?: string;
    }) => {
      trackEvent("assistant_response_completed", props);
    },

    responseFailed: (props: {
      threadId: string;
      latency_ms?: number;
      status_reason?: string;
      response_length: number;
      tool_calls_count: number;
      response_total_tokens?: number;
      response_input_tokens?: number;
      response_output_tokens?: number;
      pathname?: string;
      model_name?: string;
    }) => {
      trackEvent("assistant_response_failed", props);
    },

    newThreadClicked: (props: {
      threadId?: string;
      previous_message_count: number;
      context_total_tokens: number;
      context_usage_percent: number;
      pathname?: string;
      model_name?: string;
    }) => {
      trackEvent("assistant_new_thread_clicked", props);
    },

    feedbackSubmitted: (props: {
      threadId: string;
      messageId: string;
      type: "positive" | "negative";
      category?:
        | "wrong_information"
        | "outdated"
        | "didnt_answer"
        | "too_vague"
        | "other";
      comment_length?: number;
      user_question_length: number;
      assistant_response_length: number;
      tool_calls_count: number;
      tool_names?: string;
    }) => {
      trackEvent("assistant_feedback_submitted", props);
    },
  },
};
