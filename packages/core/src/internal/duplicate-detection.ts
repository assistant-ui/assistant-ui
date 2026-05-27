// Warns once if a second copy of @assistant-ui/core is loaded into the
// same runtime. Mismatched transitive versions of core silently break
// runtime behavior — tools registered via `makeAssistantTool` don't reach
// the active runtime, context lookups resolve to the wrong provider,
// `instanceof` checks fail (see issue #4101). The actual version diagnosis
// lives in `npx assistant-ui doctor`.
//
// The caller is responsible for gating on `process.env.NODE_ENV` so this
// module tree-shakes out of production bundles.

const KEY = Symbol.for("@assistant-ui/core.loaded");

export function checkDuplicateCore(): void {
  const g = globalThis as unknown as Record<symbol, boolean | undefined>;
  if (g[KEY]) {
    // eslint-disable-next-line no-console
    console.warn(
      "[@assistant-ui/core] Multiple copies of @assistant-ui/core are " +
        "loaded into the same runtime. This causes subtle bugs (tools not " +
        "reaching the runtime, context lookups returning the wrong " +
        "provider, instanceof checks failing). Run " +
        "`npx assistant-ui doctor` to diagnose.",
    );
  }
  g[KEY] = true;
}
