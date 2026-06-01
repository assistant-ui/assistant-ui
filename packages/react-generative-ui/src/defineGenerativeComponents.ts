import type { GenerativeUILibrary } from "./types";

/**
 * Authoring helper for a `"use generative"` generative-UI library — the set of
 * components the model may render. Each component colocates its `properties`
 * schema (kept on every build, drives the tool parameters) with its `render`
 * (kept only on the client). Pass the result to {@link JSONGenerativeUI}:
 *
 * ```tsx
 * "use generative";
 * const generative = new JSONGenerativeUI({
 *   library: defineGenerativeComponents({
 *     Card: {
 *       description: "A card.",
 *       properties: z.object({ title: z.string() }),
 *       render: (props) => <Card {...props} />,
 *     },
 *   }),
 * });
 * ```
 *
 * Like {@link defineToolkit}, it has **no runtime implementation**. A
 * `"use generative"` compiler unwraps the `defineGenerativeComponents(...)` call
 * per build, dropping each `render` (and its client-only imports) from the server
 * build. Reaching it at runtime means the module wasn't compiled (the directive
 * is missing, or it was used outside a `"use generative"` file), so it throws
 * rather than shipping client `render` code to the server.
 */
export function defineGenerativeComponents(
  _library: GenerativeUILibrary,
): GenerativeUILibrary {
  throw new Error(
    "[assistant-ui] defineGenerativeComponents() has no runtime implementation " +
      "— it is stripped at build time by the use-generative compiler. Reaching " +
      "it means this module was not compiled (e.g. used outside a " +
      '"use generative" file). Add the directive, or do not use it here.',
  );
}
