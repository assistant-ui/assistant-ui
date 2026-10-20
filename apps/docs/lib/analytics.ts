import type { WizardPageId } from "@/components/pages/shop/setup-wizard-page";
import type { LearnCourseStartSource } from "@/lib/xulux/learn/types";
import type { WebMcpToolName } from "@/lib/webmcp-tools";

declare global {
  interface Window {
    posthog?: {
      capture?: (
        event: string,
        properties?: Record<string, string | number | boolean>,
      ) => void;
      identify?: (distinctId: string) => void;
      reset?: () => void;
      group?: (type: string, key: string) => void;
      capturing?: () => boolean;
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

export type AnalyticsProperties = Record<string, string | number | boolean>;

/** Where a visitor opened a setup session: the Quick Start dialog, an AgentSetup banner on a docs page, the cart, or an example bundle page. */
export type SetupSource = "start_dialog" | "agent_setup" | "cart" | "bundle";

/** The cart surface whose Start setup button moved the cart into a session. */
export type CartCheckoutLocation =
  | "cart_page"
  | "cart_popover"
  | "checkout_page";

export type SetupErrorReason =
  | "connection_lost"
  | "agent_disconnected"
  | "session_unreadable"
  | "answer_failed";

const trackEvent = (event: string, properties?: AnalyticsProperties) => {
  if (typeof window === "undefined") return;

  // PostHog
  window.posthog?.capture?.(event, properties);

  // Vercel Analytics
  void getVercelTrack().then((track) => track?.(event, properties));
};

export const analytics = {
  cta: {
    clicked: (
      cta:
        | "get_started"
        | "contact_sales"
        | "why_us"
        | "start_setup_agent"
        | "start_setup_manual",
      location: string,
    ) => trackEvent("cta_clicked", { cta, location }),

    npmCommandCopied: (
      command = "npx assistant-ui init",
      properties?: AnalyticsProperties,
    ) => trackEvent("npm_command_copied", { ...properties, command }),

    promptCopied: (properties?: AnalyticsProperties) =>
      trackEvent("prompt_copied", properties),
  },

  demo: {
    budgetExhausted: (signedIn: boolean, limit: number) =>
      trackEvent("demo_budget_exhausted", { signed_in: signedIn, limit }),

    signInClicked: (location: string) =>
      trackEvent("demo_sign_in_clicked", { location }),

    signedIn: (location: string) => trackEvent("demo_signed_in", { location }),
  },

  shop: {
    cartToggled: (product: string, added: boolean) =>
      trackEvent("shop_cart_toggled", { product, added }),

    checkoutStarted: (props: {
      cart_size: number;
      products: string;
      location: CartCheckoutLocation;
    }) => trackEvent("shop_checkout_started", props),
  },

  setup: {
    sessionStarted: (props: {
      source: SetupSource;
      location?: string;
      products: string;
      product_count: number;
    }) => trackEvent("setup_session_started", props),

    stepViewed: (props: {
      step: WizardPageId;
      step_index: number;
      ms_on_previous_step?: number;
    }) => trackEvent("setup_step_viewed", props),

    inputAnswered: (props: {
      kind: string;
      skipped: boolean;
      model_provider?: string;
    }) => trackEvent("setup_input_answered", props),

    cloudProjectPicked: (props: {
      choice: "existing" | "another" | "sign_in_clicked";
      project_count: number;
      org_count?: number;
    }) => trackEvent("setup_cloud_project_picked", props),

    /** Associates the visitor's later events with an Assistant Cloud project through PostHog group analytics; a no-op while PostHog is not running. */
    projectGroup: (projectId: string) => {
      if (typeof window === "undefined") return;
      window.posthog?.group?.("project", projectId);
    },

    productProposed: (product: string) =>
      trackEvent("setup_product_proposed", { product, by: "agent" }),

    productAccepted: (product: string) =>
      trackEvent("setup_product_accepted", { product, by: "agent" }),

    productDeclined: (product: string) =>
      trackEvent("setup_product_declined", {
        product,
        by: "agent",
        reason: "unknown_product",
      }),

    error: (props: { reason: SetupErrorReason; step?: WizardPageId }) =>
      trackEvent("setup_error", props),

    agentConnected: () => trackEvent("setup_agent_connected"),

    installFinished: () => trackEvent("setup_install_finished"),

    cancelled: () => trackEvent("setup_cancelled"),
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

    askAITriggered: (query: string) =>
      trackEvent("search_ask_ai_triggered", { query }),
  },

  code: {
    blockCopied: (language: string, source: string) =>
      trackEvent("code_block_copied", { language, source }),
  },

  builder: {
    presetSelected: (preset: string) =>
      trackEvent("builder_preset_selected", { preset }),

    createDialogOpened: () => trackEvent("builder_create_dialog_opened"),

    commandCopied: (
      commandType: "create" | "shadcn" | "manual_init" | "manual_add",
    ) => trackEvent("builder_command_copied", { command_type: commandType }),

    codeCopied: () => trackEvent("builder_code_copied"),

    shareClicked: () => trackEvent("builder_share_clicked"),
  },

  toc: {
    actionClicked: (action: "copy" | "markdown" | "github" | "ask_ai") =>
      trackEvent("toc_action_clicked", { action }),
  },

  pageActions: {
    actionClicked: (action: "copy" | "markdown" | "claude" | "codex" | "mcp") =>
      trackEvent("page_action_clicked", { action }),
  },

  install: {
    packageManagerSelected: (pm: string) =>
      trackEvent("package_manager_selected", { package_manager: pm }),
  },

  assistant: {
    feedbackShown: (props: {
      threadId: string;
      messageId: string;
      surface?: "docs_assistant" | "home_thread";
      user_question_length: number;
      assistant_response_length: number;
      tool_calls_count: number;
      tool_names?: string;
    }) => {
      trackEvent("assistant_feedback_shown", props);
    },

    feedbackClicked: (props: {
      threadId: string;
      messageId: string;
      surface?: "docs_assistant" | "home_thread";
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
      trackEvent("assistant_feedback_clicked", props);
    },

    feedbackSubmitFailed: (props: {
      threadId: string;
      messageId: string;
      surface?: "docs_assistant" | "home_thread";
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
      error_name: string;
      error_message: string;
    }) => {
      trackEvent("assistant_feedback_submit_failed", props);
    },

    panelToggled: (props: {
      open: boolean;
      source: "trigger" | "toggle" | "header" | "shortcut";
    }) => {
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
      surface?: "docs_assistant" | "home_thread";
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

  xulux: {
    learnPageViewed: (props: {
      session_id: string;
      thread_id?: string;
      pathname?: string;
      course_id: string;
      status: "not_started" | "in_progress" | "completed";
    }) => trackEvent("learn_page_viewed", props),

    learnCourseStarted: (props: {
      session_id: string;
      thread_id?: string;
      pathname?: string;
      course_id: string;
      source: LearnCourseStartSource;
    }) => trackEvent("learn_course_started", props),

    learnStepAdvanced: (props: {
      session_id: string;
      thread_id?: string;
      pathname?: string;
      course_id: string;
      step_id: string;
      step_index: number;
    }) => trackEvent("learn_step_advanced", props),

    learnCourseCompleted: (props: {
      session_id: string;
      thread_id?: string;
      pathname?: string;
      course_id: string;
    }) => trackEvent("learn_course_completed", props),

    learnCourseDownloaded: (props: {
      session_id: string;
      thread_id?: string;
      pathname?: string;
      course_id: string;
      stage_id: string;
    }) => trackEvent("learn_course_downloaded", props),

    learnCertificateSubmitted: (props: {
      session_id: string;
      thread_id?: string;
      pathname?: string;
      course_id: string;
    }) => trackEvent("learn_certificate_submitted", props),

    playgroundViewed: (props: {
      session_id: string;
      thread_id?: string;
      pathname?: string;
    }) => trackEvent("xulux_playground_viewed", props),

    promptSubmitted: (props: {
      session_id: string;
      thread_id?: string;
      pathname?: string;
      source: "typed_prompt" | "suggestion" | "composer" | "retry";
      message_length: number;
      suggestion_group?: string;
      suggestion_label?: string;
    }) => trackEvent("xulux_prompt_submitted", props),

    suggestionSelected: (props: {
      session_id: string;
      thread_id?: string;
      pathname?: string;
      group: "New app" | "Templates" | "Learn" | "Cloud";
      label: string;
      message_length: number;
    }) => trackEvent("xulux_suggestion_selected", props),

    templatesOpened: (props: {
      session_id: string;
      thread_id?: string;
      pathname?: string;
      surface: "landing_carousel" | "header";
    }) => trackEvent("xulux_templates_opened", props),

    templateSelected: (props: {
      session_id: string;
      thread_id?: string;
      pathname?: string;
      template_id: string;
      template_kind: "template" | "example";
      surface: "landing_carousel" | "templates_modal" | "detail_modal";
      action: "open_detail" | "start" | "other_template";
      other_template_id?: string;
    }) => trackEvent("xulux_template_selected", props),

    previewShown: (props: {
      session_id: string;
      thread_id?: string;
      pathname?: string;
      source: "template" | "agent_template";
      template_id?: string;
    }) => trackEvent("xulux_preview_shown", props),

    converted: (props: {
      session_id: string;
      thread_id?: string;
      pathname?: string;
      action: "copy_prompt" | "download";
      surface: "open_in_card" | "canvas" | "detail_modal";
      download_type?: "template" | "demo";
      template_id?: string;
    }) => trackEvent("xulux_converted", props),
  },

  webmcp: {
    hostDetected: () => trackEvent("webmcp_host_detected"),

    toolRegistered: (
      props:
        | { tool: WebMcpToolName; status: "ok" }
        | { tool: WebMcpToolName; status: "failed"; error_name: string },
    ) => trackEvent("webmcp_tool_registered", props),

    toolCalled: (props: {
      tool: WebMcpToolName;
      status: "ok" | "error" | "aborted";
      latency_ms: number;
    }) => trackEvent("webmcp_tool_called", props),
  },
};
