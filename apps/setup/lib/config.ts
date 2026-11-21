const trimmed = (value: string | undefined) =>
  value?.trim().replace(/\/+$/, "") || undefined;

const development = process.env.NODE_ENV === "development";

/** The setup worker (apps/checkout-worker) the browser and the agent meet on. */
export const CHECKOUT_BASE_URL =
  trimmed(process.env.NEXT_PUBLIC_CHECKOUT_URL) ??
  (development ? "http://localhost:8791" : "https://checkout.assistant-ui.com");

/** The docs site: the product catalog, install guides, sign-in and Assistant Cloud projects. */
export const DOCS_URL =
  trimmed(process.env.NEXT_PUBLIC_DOCS_URL) ??
  (development ? "http://localhost:3000" : "https://www.assistant-ui.com");

/** The Assistant Cloud dashboard. */
export const CLOUD_URL = "https://cloud.assistant-ui.com";

/** What a person tells their coding agent to start a setup. */
export const AGENT_SETUP_PROMPT = "install and set up assistant-ui";
