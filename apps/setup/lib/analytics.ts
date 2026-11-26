import type { WizardPageId } from "@/components/wizard/setup-wizard-page";
import { agentKindName } from "@/lib/agents";

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

/** The agent kind as analytics records it: one this page names, else `other`; nothing before the CLI reports one. */
export const trackedAgentKind = (kind: string | null | undefined) =>
  kind == null ? undefined : agentKindName(kind) ? kind : "other";

const agentKindProperty = (kind: string | null | undefined) => {
  const tracked = trackedAgentKind(kind);
  return tracked === undefined ? {} : { agent_kind: tracked };
};

const reportedKey = "aui-setup-reported";
type Reported = { setup: string; keys: string[] };
let reportedInMemory: Reported | null = null;

const readReported = (): Reported | null => {
  try {
    const raw = window.localStorage.getItem(reportedKey);
    if (raw === null) return null;
    const value = JSON.parse(raw) as Partial<Reported> | null;
    return typeof value?.setup === "string" && Array.isArray(value.keys)
      ? {
          setup: value.setup,
          keys: value.keys.filter((key) => typeof key === "string"),
        }
      : null;
  } catch {
    return reportedInMemory;
  }
};

/**
 * True the first time `key` happens for `setup` in this browser. PostHog runs
 * without storage here, so every tab and reload is a new visitor; remembering
 * what one setup already reported keeps a milestone at one event per setup,
 * however many tabs the agent opened or how often the page reconnected. Only
 * the latest setup is remembered.
 */
export const firstForSetup = (setup: string, key: string) => {
  if (typeof window === "undefined") return false;
  const stored = readReported();
  const keys = stored?.setup === setup ? stored.keys : [];
  if (keys.includes(key)) return false;
  reportedInMemory = { setup, keys: [...keys, key] };
  try {
    window.localStorage.setItem(reportedKey, JSON.stringify(reportedInMemory));
  } catch {
    // Storage can be blocked; this tab still reports each milestone once.
  }
  return true;
};

/** The setup's events, named as they were on the docs site so the funnels carry on. */
export const analytics = {
  setup: {
    /** The page opened on an agent's link and asks the user to connect; the start of every setup the browser sees. */
    linkShown: (setup: string) => {
      if (firstForSetup(setup, "link_shown")) trackEvent("setup_link_shown");
    },

    linkConfirmed: () => trackEvent("setup_link_confirmed"),

    linkDeclined: () => trackEvent("setup_link_declined"),

    stepViewed: (
      setup: string,
      props: {
        step: WizardPageId;
        step_index: number;
        ms_on_previous_step?: number;
      },
    ) =>
      trackEvent("setup_step_viewed", {
        ...props,
        first_view: firstForSetup(setup, `view:${props.step}`),
      }),

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

    /** With a `setup`, once per setup, reason and step: a page that reconnects after every sleep, or an agent that comes and goes, is one problem, not one per flap. */
    error: ({
      setup,
      agentKind,
      ...props
    }: {
      reason: SetupErrorReason;
      step?: WizardPageId;
      setup?: string;
      agentKind?: string | null;
    }) => {
      if (
        setup !== undefined &&
        !firstForSetup(setup, `error:${props.reason}:${props.step ?? ""}`)
      )
        return;
      trackEvent("setup_error", { ...props, ...agentKindProperty(agentKind) });
    },

    agentConnected: (setup: string, agentKind: string | null | undefined) => {
      if (firstForSetup(setup, "agent_connected"))
        trackEvent("setup_agent_connected", agentKindProperty(agentKind));
    },

    /** The agent installed every step and proposed closing (`done`). The user closing the setup afterwards is `setup_closed`. */
    installFinished: (
      setup: string,
      props: {
        agentKind: string | null | undefined;
        steps: number;
        preview: boolean;
      },
    ) => {
      if (!firstForSetup(setup, "install_finished")) return;
      trackEvent("setup_install_finished", {
        steps: props.steps,
        preview: props.preview,
        ...agentKindProperty(props.agentKind),
      });
    },

    /** The user closed a finished setup with Finish; sent before the page lets go of the session. */
    closed: (setup: string) => {
      if (firstForSetup(setup, "closed")) trackEvent("setup_closed");
    },

    cancelled: () => trackEvent("setup_cancelled"),
  },
};
