// Detects when multiple copies of @assistant-ui/core are loaded into the
// same JavaScript runtime. This is almost always caused by mismatched
// versions between a distribution package (e.g. @assistant-ui/react) and
// one of its peers (e.g. @assistant-ui/react-ai-sdk) pulling in a
// different transitive version of @assistant-ui/core. The symptoms are
// subtle — `instanceof` checks fail, React context lookups return the
// wrong provider, and hooks like `makeAssistantTool` silently register
// against the wrong registry (see issue #4101).
//
// `registerCoreVersion` is invoked from every public entry point so a
// bundler can never tree-shake the check away — a top-level `console.warn`
// call cannot be proven side-effect-free.

import { PACKAGE_VERSION } from "./version";

const GLOBAL_KEY = Symbol.for("@assistant-ui/core.versions");

type VersionRegistry = Set<string>;

interface GlobalWithRegistry {
  [GLOBAL_KEY]?: VersionRegistry;
}

function getRegistry(): VersionRegistry {
  const g = globalThis as unknown as GlobalWithRegistry;
  let registry = g[GLOBAL_KEY];
  if (!registry) {
    registry = new Set<string>();
    g[GLOBAL_KEY] = registry;
  }
  return registry;
}

let warned = false;

export function registerCoreVersion(): void {
  if (process.env.NODE_ENV === "production") return;

  const registry = getRegistry();
  registry.add(PACKAGE_VERSION);

  if (warned || registry.size < 2) return;
  warned = true;

  const versions = Array.from(registry).sort();
  // eslint-disable-next-line no-console
  console.warn(
    `[@assistant-ui/core] Multiple versions of @assistant-ui/core are loaded ` +
      `into the same runtime (${versions.join(", ")}). This usually causes ` +
      `subtle runtime bugs — tools registered via makeAssistantTool may not ` +
      `reach the active runtime, context lookups can resolve to the wrong ` +
      `provider, and instanceof checks will fail.\n` +
      `Run \`npx assistant-ui doctor\` to diagnose mismatched versions and ` +
      `see suggested fixes.`,
  );
}

// Test-only: reset the "warned" latch so a single test process can
// exercise the warning path more than once.
export function __resetDuplicateDetectionForTests(): void {
  warned = false;
}
