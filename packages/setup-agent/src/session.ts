import { spawn } from "node:child_process";
import { randomInt } from "node:crypto";
import { detectAgentKind } from "./agents";
import { connectCheckout } from "./client";
import type { CheckoutClient } from "./client";
import type { Checkout } from "./protocol";

const ID_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** A random id in the alphabet and length the setup page uses for its own. */
export const createSetupId = (length = 12) =>
  Array.from(
    { length },
    () => ID_ALPHABET[randomInt(ID_ALPHABET.length)]!,
  ).join("");

/** The setup page that joins a link; the link rides in the fragment, which never reaches a server. */
export const setupPageUrl = (
  setupAppUrl: string,
  linkId: string,
  setupId: string,
) => `${setupAppUrl.replace(/\/$/, "")}/#link=${linkId}&setup=${setupId}`;

/**
 * Opens `url` in the user's default browser without waiting for it.
 * `SETUP_AGENT_BROWSER` names another program to run with the URL instead,
 * such as a test driver.
 */
export const openUrl = (url: string, env: NodeJS.ProcessEnv = process.env) => {
  const custom = env.SETUP_AGENT_BROWSER?.trim();
  const [command, args] = custom
    ? [custom, [url]]
    : process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["rundll32", ["url.dll,FileProtocolHandler", url]]
        : ["xdg-open", [url]];
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.on("error", () => {});
  child.unref();
};

export type StartSetupSessionOptions = {
  /** The setup server, such as https://checkout.assistant-ui.com. */
  server: string;
  /** The setup app the browser opens, such as https://setup.assistant-ui.com. */
  setupAppUrl: string;
  products: Checkout.ProductSeed[];
  instructions?: string;
  env?: NodeJS.ProcessEnv;
  connect?: (url: string) => Promise<CheckoutClient>;
};

export type SetupSession = {
  linkId: string;
  setupId: string;
  /** The URL every setup command takes. */
  agentUrl: string;
  /** The page the user follows the setup on. */
  browserUrl: string;
  products: Checkout.ProductSeed[];
};

/**
 * Opens a new link on the setup server, creates a setup on it and starts
 * planning, so the page opens on the agent's first question rather than a
 * Begin plan click. Opens no browser: the stream does, once the setup waits
 * on the user.
 */
export const startSetupSession = async ({
  server,
  setupAppUrl,
  products,
  instructions,
  env = process.env,
  connect = connectCheckout,
}: StartSetupSessionOptions): Promise<SetupSession> => {
  const linkId = createSetupId();
  const setupId = createSetupId();
  const agentUrl = `${server.replace(/\/$/, "")}/${linkId}`;
  const client = await connect(agentUrl);
  try {
    const kind = detectAgentKind(env);
    await client.commands["checkout/create"]({
      id: setupId,
      products,
      ...(instructions !== undefined && { instructions }),
    });
    await client.commands["checkout/begin-plan"]();
    // The agent shows as connected once its stream says hello with the cwd.
    await client.commands["agent/intro"]({
      ...(kind !== undefined && { kind }),
    });
  } finally {
    client.dispose();
  }
  return {
    linkId,
    setupId,
    agentUrl,
    browserUrl: setupPageUrl(setupAppUrl, linkId, setupId),
    products,
  };
};
