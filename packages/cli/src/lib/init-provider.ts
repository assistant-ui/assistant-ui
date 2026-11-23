import fs from "node:fs";
import path from "node:path";
import { runSpawn } from "./run-spawn";
import { assertSafeProjectFile } from "./safe-project-file";
import type { PackageManagerName } from "./utils/package-manager";

/** The model providers `init` can scaffold the chat route with. */
const CHAT_PROVIDERS = {
  openai: {
    name: "OpenAI",
    pkg: "@ai-sdk/openai",
    model: undefined,
    key: "OPENAI_API_KEY",
  },
  anthropic: {
    name: "Anthropic",
    pkg: "@ai-sdk/anthropic",
    model: "claude-opus-5-5",
    key: "ANTHROPIC_API_KEY",
  },
  google: {
    name: "Google",
    pkg: "@ai-sdk/google",
    model: "gemini-3.8-flash",
    key: "GOOGLE_GENERATIVE_AI_API_KEY",
  },
} as const;
export type ChatProvider = keyof typeof CHAT_PROVIDERS;
export const CHAT_PROVIDER_IDS = Object.keys(CHAT_PROVIDERS) as ChatProvider[];

const ENV_FILES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
];

const readText = (file: string) => {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
};

/** What the project has before `init` touches it. */
export type ProjectProviders = {
  /** Providers whose AI SDK package or API key the project already has. */
  used: ChatProvider[];
  /** Whether @ai-sdk/openai was already a dependency. */
  hadOpenAI: boolean;
  /** Whether the chat route existed. */
  hadRoute: boolean;
};

const ROUTE_FILES = ["app/api/chat/route.ts", "src/app/api/chat/route.ts"];

/** The providers a project already uses: AI SDK provider packages in package.json and API keys set in its env files. */
export function snapshotProjectProviders(root: string): ProjectProviders {
  let deps: Record<string, unknown> = {};
  try {
    const pkg = JSON.parse(readText(path.join(root, "package.json"))) as {
      dependencies?: Record<string, unknown>;
      devDependencies?: Record<string, unknown>;
    };
    deps = { ...pkg.dependencies, ...pkg.devDependencies };
  } catch {
    // No readable package.json: no packages to go by.
  }
  const env = ENV_FILES.map((file) => readText(path.join(root, file))).join(
    "\n",
  );
  const used = CHAT_PROVIDER_IDS.filter(
    (id) =>
      Object.hasOwn(deps, CHAT_PROVIDERS[id].pkg) ||
      new RegExp(
        `^[ \\t]*(?:export[ \\t]+)?${CHAT_PROVIDERS[id].key}[ \\t]*=[ \\t]*[^\\s#]`,
        "m",
      ).test(env),
  );
  return {
    used,
    hadOpenAI: Object.hasOwn(deps, CHAT_PROVIDERS.openai.pkg),
    hadRoute: ROUTE_FILES.some((file) => fs.existsSync(path.join(root, file))),
  };
}

/**
 * The chat route's provider: the one `--provider` names, else the one the
 * project already uses when it uses exactly one, else OpenAI, the registry
 * route's own.
 */
export function chooseChatProvider(
  requested: ChatProvider | undefined,
  used: readonly ChatProvider[],
): { provider: ChatProvider; source: "flag" | "project" | "default" } {
  if (requested !== undefined) return { provider: requested, source: "flag" };
  if (used.length === 1) return { provider: used[0]!, source: "project" };
  return { provider: "openai", source: "default" };
}

const OPENAI_IMPORT = /import \{ openai \} from "@ai-sdk\/openai";/;
const OPENAI_MODEL = /\bopenai\("[^"]*"\)/;

/** The scaffolded route source on `provider`, or undefined when it is not the route `init` scaffolds. */
export function switchRouteProvider(
  source: string,
  provider: ChatProvider,
): string | undefined {
  if (!OPENAI_IMPORT.test(source) || !OPENAI_MODEL.test(source))
    return undefined;
  const { pkg, model } = CHAT_PROVIDERS[provider];
  if (model === undefined) return source;
  return source
    .replace(OPENAI_IMPORT, `import { ${provider} } from "${pkg}";`)
    .replace(OPENAI_MODEL, `${provider}("${model}")`);
}

const ADD: Record<PackageManagerName, string> = {
  npm: "install",
  pnpm: "add",
  yarn: "add",
  bun: "add",
};
const REMOVE: Record<PackageManagerName, string> = {
  npm: "uninstall",
  pnpm: "remove",
  yarn: "remove",
  bun: "remove",
};

/** The package manager commands that move the project from @ai-sdk/openai to `provider`'s package. */
export function providerInstallCommands(
  pm: PackageManagerName,
  provider: ChatProvider,
  hadOpenAI: boolean,
): [string, string[]][] {
  const commands: [string, string[]][] = [
    [pm, [ADD[pm], CHAT_PROVIDERS[provider].pkg]],
  ];
  if (!hadOpenAI) commands.push([pm, [REMOVE[pm], CHAT_PROVIDERS.openai.pkg]]);
  return commands;
}

/** Where the scaffolded chat route is, relative to the project root. */
const findChatRoute = (root: string) =>
  ROUTE_FILES.find((file) => fs.existsSync(path.join(root, file)));

/** What `init` prints about the chat route's provider. */
export function describeProvider(
  provider: ChatProvider,
  source: "flag" | "project" | "default",
  used: readonly ChatProvider[],
): string {
  const { name, model, key } = CHAT_PROVIDERS[provider];
  const why =
    source === "flag"
      ? "as --provider asked"
      : source === "project"
        ? "the provider this project already uses"
        : used.length > 1
          ? `the default; this project uses ${used.map((id) => CHAT_PROVIDERS[id].name).join(" and ")}, so pass --provider to pick one`
          : `the default; pass --provider ${CHAT_PROVIDER_IDS.filter((id) => id !== "openai").join(" or ")} for another`;
  return `Chat route: ${name}${model ? ` (${model})` : ""}, ${why}. Set ${key} in .env.local.`;
}

/**
 * Moves the chat route `init` just scaffolded onto the provider asked for or
 * the one the project already uses. A route the project had before is never
 * touched. Returns what to tell the user.
 */
export async function applyChatProvider(
  root: string,
  pm: PackageManagerName,
  requested: ChatProvider | undefined,
  providers: ProjectProviders,
): Promise<string | undefined> {
  if (providers.hadRoute) return undefined;
  const route = findChatRoute(root);
  if (route === undefined) return undefined;
  const { provider, source } = chooseChatProvider(requested, providers.used);
  const note = describeProvider(provider, source, providers.used);
  if (provider === "openai") return note;
  const file = path.join(root, route);
  const switched = switchRouteProvider(fs.readFileSync(file, "utf8"), provider);
  if (switched === undefined)
    return `${route} is not the route init scaffolds, so it stays as it is; switch it to ${provider} yourself.`;
  assertSafeProjectFile(file, root);
  fs.writeFileSync(file, switched);
  for (const [command, args] of providerInstallCommands(
    pm,
    provider,
    providers.hadOpenAI,
  ))
    await runSpawn(command, args, root);
  return note;
}
