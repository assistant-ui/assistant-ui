import { spawn } from "node:child_process";
import { connectCheckout } from "setup-agent";
import type { Checkout, CheckoutClient } from "setup-agent";
import { parseSetupUrl } from "setup-agent/cli";
import {
  createSetupId,
  setupBriefing,
  setupPageUrl,
  startSetupSession,
} from "setup-agent/sdk";
import type { SetupSession } from "setup-agent/sdk";

export { createSetupId, setupPageUrl };

/** How an agent runs setup commands: `<SETUP_COMMAND> <url> <command>`. */
export const SETUP_COMMAND = "npx assistant-ui@latest setup";

/** The docs site: the catalog and the install guides. */
export const DEFAULT_DOCS_URL = "https://www.assistant-ui.com";
/** The setup worker the agent and the browser meet on. */
export const DEFAULT_SETUP_SERVER = "https://checkout.assistant-ui.com";
/** The setup app the user follows the setup in. */
export const DEFAULT_SETUP_APP_URL = "https://setup.assistant-ui.com";
const DEFAULT_PRODUCTS = ["assistant-ui"] as const;

/** A catalog slug: lowercase words joined by `-`, in `/`-separated segments (`guides/latex`). */
const SLUG = /^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/;

/** The product slugs a `--products` list names, deduplicated; the default when empty. */
export const parseProducts = (value: string | undefined): string[] => {
  const slugs = [
    ...new Set(
      (value ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ];
  for (const slug of slugs) {
    if (!SLUG.test(slug)) throw new Error(`"${slug}" is not a product slug`);
  }
  return slugs.length > 0 ? slugs : [...DEFAULT_PRODUCTS];
};

/**
 * Product names by slug, read from the catalog: its products are `## Name`
 * sections with a `Slug: slug` line, its guides and elements are
 * `- slug: Name (url, …)` bullets.
 */
export const parseCatalog = (markdown: string): Map<string, string> => {
  const names = new Map<string, string>();
  for (const match of markdown.matchAll(/^## (.+)\n+Slug: (\S+)$/gm)) {
    names.set(match[2]!, match[1]!.trim());
  }
  for (const match of markdown.matchAll(
    /^- ([a-z0-9][a-z0-9/-]*): ([^(\n]+?) \(https?:\/\//gm,
  )) {
    names.set(match[1]!, match[2]!.trim());
  }
  return names;
};

const fetchCatalog = async (docsUrl: string) => {
  try {
    const response = await fetch(`${docsUrl}/catalog.md`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return undefined;
    const names = parseCatalog(await response.text());
    return names.size > 0 ? names : undefined;
  } catch {
    return undefined;
  }
};

/** The products to seed a setup with, named from the catalog when it is reachable. */
export const resolveProducts = async (
  slugs: readonly string[],
  docsUrl: string,
  catalog: () => Promise<Map<string, string> | undefined> = () =>
    fetchCatalog(docsUrl),
): Promise<Checkout.ProductSeed[]> => {
  const names = await catalog();
  if (names) {
    const unknown = slugs.filter((slug) => !names.has(slug));
    if (unknown.length > 0) {
      throw new Error(
        `unknown product ${unknown.map((slug) => `"${slug}"`).join(", ")}; pick from ${[...names.keys()].join(", ")}`,
      );
    }
  }
  return slugs.map((slug) => ({
    slug,
    name: names?.get(slug) ?? slug,
    guide: `${docsUrl}/install.md?items=${slug}`,
  }));
};

export type SetupEndpoints = {
  docsUrl: string;
  setupServer: string;
  setupAppUrl: string;
};

/** The docs site, setup server and setup app, from flags, then the environment, then production. */
export const resolveEndpoints = (
  options: { docsUrl?: string; setupServer?: string; setupAppUrl?: string },
  env: NodeJS.ProcessEnv = process.env,
): SetupEndpoints => ({
  docsUrl: parseSetupUrl(
    options.docsUrl ?? env.ASSISTANT_UI_DOCS_URL ?? DEFAULT_DOCS_URL,
  ),
  setupServer: parseSetupUrl(
    options.setupServer ??
      env.ASSISTANT_UI_SETUP_SERVER ??
      DEFAULT_SETUP_SERVER,
  ),
  setupAppUrl: parseSetupUrl(
    options.setupAppUrl ??
      env.ASSISTANT_UI_SETUP_APP_URL ??
      DEFAULT_SETUP_APP_URL,
  ),
});

export type StartedSetup = SetupSession;

/**
 * Opens a new link on the setup server, creates a setup on it and starts
 * planning. Opens no browser; the stream does once the setup needs the user.
 */
export const startSetup = ({
  endpoints,
  products,
  env = process.env,
  connect = connectCheckout,
}: {
  endpoints: SetupEndpoints;
  products: Checkout.ProductSeed[];
  env?: NodeJS.ProcessEnv;
  connect?: (url: string) => Promise<CheckoutClient>;
}): Promise<StartedSetup> =>
  startSetupSession({
    server: endpoints.setupServer,
    setupAppUrl: endpoints.setupAppUrl,
    products,
    env,
    connect,
  });

/** What the agent reads first in the output of `assistant-ui setup`, which keeps running as the stream. */
export const agentBriefing = (setup: StartedSetup, canOpen = true) =>
  setupBriefing(setup, {
    command: SETUP_COMMAND,
    name: "assistant-ui setup",
    canOpen,
  });

/** The prompt a person pastes into a coding agent, or the one it starts with. */
export const setupPrompt = (products?: readonly string[]) => {
  const custom =
    products !== undefined &&
    (products.length !== DEFAULT_PRODUCTS.length ||
      products.some((slug, index) => slug !== DEFAULT_PRODUCTS[index]));
  return custom
    ? `set up assistant-ui with \`npx assistant-ui@latest setup --products ${products.join(",")}\``
    : "set up assistant-ui";
};

/** `text` framed in a box, one line per row, for the terminal. */
export const boxed = (text: string, padding = 2) => {
  const lines = text.split("\n");
  const width = Math.max(...lines.map((line) => line.length));
  const pad = " ".repeat(padding);
  const blank = `│${" ".repeat(width + padding * 2)}│`;
  return [
    `┌${"─".repeat(width + padding * 2)}┐`,
    blank,
    ...lines.map((line) => `│${pad}${line.padEnd(width)}${pad}│`),
    blank,
    `└${"─".repeat(width + padding * 2)}┘`,
  ].join("\n");
};

type ClipboardCommand = { command: string; args: string[] };

/** The clipboard commands to try on this platform, in order. */
export const clipboardCommands = (
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): ClipboardCommand[] => {
  if (platform === "darwin") return [{ command: "pbcopy", args: [] }];
  if (platform === "win32") return [{ command: "clip", args: [] }];
  const x11 = [
    { command: "xclip", args: ["-selection", "clipboard"] },
    { command: "xsel", args: ["--clipboard", "--input"] },
  ];
  return env.WAYLAND_DISPLAY
    ? [{ command: "wl-copy", args: [] }, ...x11]
    : [...x11, { command: "wl-copy", args: [] }];
};

const pipeTo = ({ command, args }: ClipboardCommand, text: string) =>
  new Promise<boolean>((resolve) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "ignore", "ignore"],
    });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
    child.stdin.on("error", () => {});
    child.stdin.end(text);
  });

/** Copies `text` with the first clipboard command that works; false when none does. */
export const copyToClipboard = async (
  text: string,
  commands: ClipboardCommand[] = clipboardCommands(),
) => {
  for (const command of commands) {
    if (await pipeTo(command, text)) return true;
  }
  return false;
};
