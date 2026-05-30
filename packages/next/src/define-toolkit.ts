import type { Toolkit, ToolkitDeclaration } from "@assistant-ui/core/react";

/**
 * Authoring helper for a `"use generative"` toolkit. Accepts the permissive
 * {@link ToolkitDeclaration} (a `backend` tool may carry its server `execute`)
 * and types the result as the canonical {@link Toolkit}.
 *
 * It has **no runtime implementation**. The `@assistant-ui/next` compiler strips
 * the `defineToolkit(...)` wrapper (and its import) per build, so a correctly
 * compiled `export default defineToolkit({...})` never calls this. If it *does*
 * run, the module was not compiled by the use-generative loader — e.g.
 * `defineToolkit` used outside a `"use generative"` file — which would ship a
 * backend `execute` to the client. So it throws instead of silently leaking.
 */
export function defineToolkit(_declaration: ToolkitDeclaration): Toolkit {
  throw new Error(
    "[assistant-ui/next] defineToolkit() has no runtime implementation — it is " +
      "stripped at build time by the use-generative compiler. Reaching it means " +
      'this module was not compiled (e.g. defineToolkit used outside a "use ' +
      'generative" file). Add the directive, or do not use defineToolkit here.',
  );
}
