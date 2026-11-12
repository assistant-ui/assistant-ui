import type { WizardPageId } from "@/components/wizard/setup-wizard-page";

type Properties = Record<string, string | number | boolean>;

declare global {
  interface Window {
    posthog?: {
      capture?: (event: string, properties?: Properties) => void;
      group?: (type: string, key: string) => void;
    };
  }
}

export type SetupErrorReason =
  | "connection_lost"
  | "agent_disconnected"
  | "session_unreadable"
  | "answer_failed";

const trackEvent = (event: string, properties?: Properties) => {
  if (typeof window === "undefined") return;
  window.posthog?.capture?.(event, properties);
};

/** The setup's events, named as they were on the docs site so the funnels carry on. */
export const analytics = {
  setup: {
    linkConfirmed: () => trackEvent("setup_link_confirmed"),

    linkDeclined: () => trackEvent("setup_link_declined"),

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
};
