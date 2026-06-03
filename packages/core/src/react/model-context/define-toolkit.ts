import type {
  Toolkit,
  ToolkitDefinition,
  ToolkitDefinitionEntryWithParameters,
} from "./toolbox";

/**
 * Authoring helper for a `"use generative"` toolkit. Accepts the permissive
 * {@link ToolkitDefinition} (a `backend` tool may carry its server `execute`)
 * and types the result as the canonical {@link Toolkit}.
 *
 * It has **no runtime implementation**. A `"use generative"` compiler (e.g.
 * `@assistant-ui/next` or `@assistant-ui/vite`) strips the `defineToolkit(...)`
 * wrapper (and its import) per build, so a correctly compiled
 * `export default defineToolkit({...})` never calls this. If it *does* run, the
 * module was not compiled by a use-generative loader — e.g. `defineToolkit` used
 * outside a `"use generative"` file — which would ship a backend `execute` to the
 * client. So it throws instead of silently leaking.
 */
export function defineToolkit<
  TArgsByName extends {
    [K in keyof TArgsByName]: Record<string, unknown>;
  },
  TResultByName extends { [K in keyof TArgsByName]: unknown } = {
    [K in keyof TArgsByName]: unknown;
  },
>(_definition: {
  [K in keyof TArgsByName]: ToolkitDefinitionEntryWithParameters<
    TArgsByName[K],
    TResultByName[K]
  >;
}): Toolkit;
export function defineToolkit(_definition: ToolkitDefinition): Toolkit;
export function defineToolkit(_definition: ToolkitDefinition): Toolkit {
  throw new Error(
    "[assistant-ui] defineToolkit() has no runtime implementation — it is " +
      "stripped at build time by the use-generative compiler. Reaching it means " +
      'this module was not compiled (e.g. defineToolkit used outside a "use ' +
      'generative" file). Add the directive, or do not use defineToolkit here.',
  );
}
