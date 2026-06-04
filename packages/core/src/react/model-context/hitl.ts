/**
 * Marks a tool as **human-in-the-loop**: the agent pauses and the UI (`render`)
 * supplies the result instead of code. Use it as the tool's `execute`:
 *
 * ```tsx
 * confirm: { execute: humanTool(), render: (props) => <Confirm {...props} /> }
 * ```
 *
 * Like {@link defineToolkit}, it has **no runtime implementation**: a
 * `"use generative"` compiler (e.g. `@assistant-ui/next` or `@assistant-ui/vite`)
 * detects `execute: humanTool()`, drops it, and stamps the tool `type: "human"`.
 * Reaching it at runtime means the module wasn't compiled (used outside a
 * `"use generative"` file), so it throws.
 */
export function humanTool(): never {
  throw new Error(
    "[assistant-ui] humanTool() has no runtime implementation — it marks a " +
      "human-in-the-loop tool and is stripped at build time by the " +
      "use-generative compiler. Reaching it means this module was not compiled " +
      '(e.g. humanTool() used outside a "use generative" file).',
  );
}

/**
 * @deprecated Use {@link humanTool}.
 */
export const hitlTool = humanTool;

/**
 * @deprecated Use {@link humanTool}.
 */
export const hitl = humanTool;
