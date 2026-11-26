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

/** Events captured before PostHog finished loading; a page without PostHog (no key, Global Privacy Control) keeps at most this many and sends none. */
const pendingEvents: [event: string, properties: Properties | undefined][] = [];
const MAX_PENDING_EVENTS = 50;

const trackEvent = (event: string, properties?: Properties) => {
  if (typeof window === "undefined") return;
  const capture = window.posthog?.capture;
  if (capture) capture(event, properties);
  else if (pendingEvents.length < MAX_PENDING_EVENTS)
    pendingEvents.push([event, properties]);
};

/** Sends what the page captured before PostHog loaded, such as the first page's view and the link shown; `Analytics` calls it once PostHog runs. */
export const flushPendingEvents = () => {
  const capture = window.posthog?.capture;
  if (!capture) return;
  for (const [event, properties] of pendingEvents.splice(0))
    capture(event, properties);
};

/** The agent kind as analytics records it: one this page names, else `other`; nothing before the CLI reports one. */
export const trackedAgentKind = (kind: string | null | undefined) =>
  kind == null ? undefined : agentKindName(kind) ? kind : "other";

const agentKindProperty = (kind: string | null | undefined) => {
  const tracked = trackedAgentKind(kind);
  return tracked === undefined ? {} : { agent_kind: tracked };
};

const reportedKey = "aui-setup-reported";
/** What each setup already reported, by setup id, oldest setup first. */
type Reported = Record<string, string[]>;
/** How many setups the record keeps; older ones drop off. */
const MAX_REMEMBERED_SETUPS = 10;
let reportedInMemory: Reported = {};
/** False once a write to storage failed; the tab then trusts its own record. */
let persisted = true;

const readReported = (): Reported => {
  if (!persisted) return reportedInMemory;
  try {
    const raw = window.localStorage.getItem(reportedKey);
    if (raw === null) return {};
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value))
      return {};
    return Object.fromEntries(
      Object.entries(value).flatMap(([setup, keys]) =>
        Array.isArray(keys)
          ? [[setup, keys.filter((key) => typeof key === "string")]]
          : [],
      ),
    );
  } catch {
    return reportedInMemory;
  }
};

/**
 * True the first time `key` happens for `setup` in this browser. PostHog runs
 * without storage here, so every tab and reload is a new visitor; remembering
 * what each setup already reported keeps a milestone at one event per setup,
 * however many tabs the agent opened or how often the page reconnected. The
 * record keeps the last `MAX_REMEMBERED_SETUPS` setups. Storage has no
 * cross-tab lock, so two tabs on one setup that claim the same milestone in
 * the same instant can both report it; the setup CLI opens one tab for
 * everything waiting and no second one within 30 seconds (setup-agent
 * README), so that takes a tab the user opened themselves.
 */
export const firstForSetup = (setup: string, key: string) => {
  if (typeof window === "undefined") return false;
  const stored = readReported();
  const keys = stored[setup] ?? [];
  if (keys.includes(key)) return false;
  const others = Object.entries(stored).filter(([id]) => id !== setup);
  reportedInMemory = Object.fromEntries([
    ...others.slice(-(MAX_REMEMBERED_SETUPS - 1)),
    [setup, [...keys, key]],
  ]);
  try {
    window.localStorage.setItem(reportedKey, JSON.stringify(reportedInMemory));
    persisted = true;
  } catch {
    // Storage can be blocked or full; this tab still reports each milestone once.
    persisted = false;
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

    /** `default_products` tells a setup the bare prompt started (`npx assistant-ui@latest setup`, assistant-ui alone) from one a product's prompt started with `--products`. */
    agentConnected: (
      setup: string,
      props: {
        agentKind: string | null | undefined;
        products: readonly string[];
      },
    ) => {
      if (!firstForSetup(setup, "agent_connected")) return;
      trackEvent("setup_agent_connected", {
        product_count: props.products.length,
        default_products:
          props.products.length === 1 && props.products[0] === "assistant-ui",
        ...agentKindProperty(props.agentKind),
      });
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

    /** The setup closed as finished: the user pressed Finish (sent before the page lets go of the session), or the page saw it closed from elsewhere. */
    closed: (setup: string) => {
      if (firstForSetup(setup, "closed")) trackEvent("setup_closed");
    },

    cancelled: () => trackEvent("setup_cancelled"),
  },
};
