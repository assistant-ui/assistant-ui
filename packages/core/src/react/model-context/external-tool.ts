/**
 * Marks a generative toolkit entry as an externally executed backend tool.
 *
 * Use this when another system (for example a backend route or LangGraph node)
 * already defines and executes the tool, but assistant-ui should render its
 * tool calls. The entry must declare `render` or `renderText`, and its key must
 * match the tool name the other system publishes. The use-generative compiler
 * omits `execute: externalTool()` entries from the server build. The client
 * build keeps `type: "backend"`, the renderer, and `display`, and strips
 * `description`, `parameters`, and the other model-facing fields, so the entry
 * never reaches the model.
 *
 * @example
 * ```tsx
 * web_search: {
 *   execute: externalTool(),
 *   render: ({ args, result }) => (
 *     <SearchResults query={args.query} results={result?.results ?? []} />
 *   ),
 * },
 * ```
 */
export function externalTool(): never {
  throw new Error(
    "[assistant-ui] externalTool() has no runtime implementation - it marks a " +
      "tool that executes outside assistant-ui and is stripped at build time " +
      'by the use-generative compiler. Make sure this module is compiled as "use generative".',
  );
}
