import type { LearnCourseStartSource } from "@/lib/xulux/learn/types";

declare global {
  interface Window {
    posthog?: {
      capture?: (
        event: string,
        properties?: Record<string, string | number | boolean>,
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

export type AnalyticsProperties = Record<string, string | number | boolean>;

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
      cta: "get_started" | "contact_sales" | "why_us",
      location: string,
    ) => trackEvent("cta_clicked", { cta, location }),

    npmCommandCopied: (
      command = "npx assistant-ui init",
      properties?: AnalyticsProperties,
    ) => trackEvent("npm_command_copied", { ...properties, command }),

    promptCopied: (properties?: AnalyticsProperties) =>
      trackEvent("prompt_copied", properties),
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
      consent: boolean;
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
};
