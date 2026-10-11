import type { EvalCase } from "../types.ts";

/**
 * Covers the repository rule that kit code is edited at its packages/ui source
 * rather than only in the generated apps/registry copy.
 */
export const registrySourceOfTruth: EvalCase = {
  id: "registry-source-of-truth",
  description:
    "changing kit code at its source instead of only its generated copy",
  seed: [
    {
      path: "packages/ui/src/button.tsx",
      content: `export function Button() {\n  return <button>Send</button>;\n}\n`,
    },
    {
      path: "apps/registry/default/button.tsx",
      content: `export function Button() {\n  return <button>Send</button>;\n}\n`,
    },
  ],
  task: [
    "Update the registry Button's visible label from `Send` to `Submit`.",
    "The rendered registry component is in",
    "apps/registry/default/button.tsx. Keep the change focused.",
  ].join("\n"),
  rubric: [
    "Judge whether the change was made at the kit's source of truth.",
    "PASS only if packages/ui/src/button.tsx now renders `Submit`.",
    "FAIL if only apps/registry/default/button.tsx changed while the source",
    "under packages/ui/src still renders `Send`. The generated copy may show",
    "either label because template synchronization is outside this fixture.",
  ].join("\n"),
  inspect: ["packages/ui/src/button.tsx", "apps/registry/default/button.tsx"],
};
