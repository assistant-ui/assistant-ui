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

const ROUTE_FILES = [
  "app/api/chat/route.ts",
  "src/app/api/chat/route.ts",
  "app/api/chat/route.js",
  "src/app/api/chat/route.js",
];

/** What the project has before `init` touches it. */
export type ProjectSnapshot = {
  /** Whether @ai-sdk/openai was already a dependency. */
  hadOpenAI: boolean;
  /** Each chat route file that existed, by path, with its source. */
  routes: Record<string, string>;
};

export function snapshotProject(root: string): ProjectSnapshot {
  let deps: Record<string, unknown> = {};
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, unknown>;
      devDependencies?: Record<string, unknown>;
      optionalDependencies?: Record<string, unknown>;
      peerDependencies?: Record<string, unknown>;
    };
    deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.optionalDependencies,
      ...pkg.peerDependencies,
    };
  } catch {
    // No readable package.json: nothing to keep.
  }
  const routes: Record<string, string> = {};
  for (const file of ROUTE_FILES) {
    try {
      routes[file] = fs.readFileSync(path.join(root, file), "utf8");
    } catch {
      // Not there.
    }
  }
  return { hadOpenAI: Object.hasOwn(deps, CHAT_PROVIDERS.openai.pkg), routes };
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

/**
 * Moves the chat route `init` just scaffolded onto the provider `--provider`
 * names, so the project ends with that provider's package only. A route the
 * project had before and `init` left alone is never touched; a scaffold that
 * replaced it (with --overwrite) is switched like a new one. The provider's
 * package installs before the route changes, so a failed install leaves a
 * working OpenAI route. Returns what to tell the user, including when the
 * flag could not apply.
 */
export async function applyChatProvider(
  root: string,
  pm: PackageManagerName,
  provider: ChatProvider | undefined,
  snapshot: ProjectSnapshot,
  { skipInstall = false }: { skipInstall?: boolean } = {},
): Promise<string | undefined> {
  if (provider === undefined || provider === "openai") return undefined;
  const route = ROUTE_FILES.find((file) =>
    fs.existsSync(path.join(root, file)),
  );
  const file = route === undefined ? undefined : path.join(root, route);
  const source = file === undefined ? undefined : fs.readFileSync(file, "utf8");
  const switched =
    route === undefined || snapshot.routes[route] === source
      ? undefined
      : switchRouteProvider(source!, provider);
  if (switched === undefined)
    return `--provider ${provider} did not apply: ${route ?? "app/api/chat/route.ts"} is not a route init scaffolded in this run, so switch its provider yourself.`;
  const [add, remove] = providerInstallCommands(
    pm,
    provider,
    snapshot.hadOpenAI,
  );
  if (!skipInstall) await runSpawn(add![0], add![1], root);
  assertSafeProjectFile(file!, root);
  fs.writeFileSync(file!, switched);
  if (remove !== undefined && !skipInstall)
    await runSpawn(remove[0], remove[1], root);
  const { name, pkg, model, key } = CHAT_PROVIDERS[provider];
  return `Chat route: ${name} (${model}).${skipInstall ? ` Install ${pkg} (--skip-install left it out).` : ""} Set ${key} in .env.local.`;
}
