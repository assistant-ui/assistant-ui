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

const ROUTE_FILES = ["app/api/chat/route.ts", "src/app/api/chat/route.ts"];

/** What the project has before `init` touches it. */
export type ProjectSnapshot = {
  /** Whether @ai-sdk/openai was already a dependency. */
  hadOpenAI: boolean;
  /** Whether the chat route existed. */
  hadRoute: boolean;
};

export function snapshotProject(root: string): ProjectSnapshot {
  let deps: Record<string, unknown> = {};
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, unknown>;
      devDependencies?: Record<string, unknown>;
    };
    deps = { ...pkg.dependencies, ...pkg.devDependencies };
  } catch {
    // No readable package.json: nothing to keep.
  }
  return {
    hadOpenAI: Object.hasOwn(deps, CHAT_PROVIDERS.openai.pkg),
    hadRoute: ROUTE_FILES.some((file) => fs.existsSync(path.join(root, file))),
  };
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

/**
 * Moves the chat route `init` just scaffolded onto the provider `--provider`
 * names, so the project ends with that provider's package only. A route the
 * project had before is never touched. Returns what to tell the user.
 */
export async function applyChatProvider(
  root: string,
  pm: PackageManagerName,
  provider: ChatProvider | undefined,
  snapshot: ProjectSnapshot,
): Promise<string | undefined> {
  if (provider === undefined || provider === "openai" || snapshot.hadRoute)
    return undefined;
  const route = findChatRoute(root);
  if (route === undefined) return undefined;
  const file = path.join(root, route);
  const switched = switchRouteProvider(fs.readFileSync(file, "utf8"), provider);
  if (switched === undefined)
    return `${route} is not the route init scaffolds, so it stays as it is; switch it to ${provider} yourself.`;
  assertSafeProjectFile(file, root);
  fs.writeFileSync(file, switched);
  for (const [command, args] of providerInstallCommands(
    pm,
    provider,
    snapshot.hadOpenAI,
  ))
    await runSpawn(command, args, root);
  const { name, model, key } = CHAT_PROVIDERS[provider];
  return `Chat route: ${name} (${model}). Set ${key} in .env.local.`;
}
