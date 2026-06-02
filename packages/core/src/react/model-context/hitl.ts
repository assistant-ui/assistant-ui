/**
 * Marks a tool as **human-in-the-loop**: the agent pauses and the UI (`render`)
 * supplies the result instead of code. Use it as the tool's `execute`:
 *
 * ```tsx
 * confirm: { execute: hitlTool(), render: (props) => <Confirm {...props} /> }
 * ```
 *
 * Like {@link defineToolkit}, it has **no runtime implementation**: a
 * `"use generative"` compiler (e.g. `@assistant-ui/next` or `@assistant-ui/vite`)
 * detects `execute: hitlTool()`, drops it, and stamps the tool `type: "human"`.
 * Reaching it at runtime means the module wasn't compiled (used outside a
 * `"use generative"` file), so it throws.
 */
export function hitlTool(): never {
  throw new Error(
    "[assistant-ui] hitlTool() has no runtime implementation — it marks a " +
      "human-in-the-loop tool and is stripped at build time by the " +
      "use-generative compiler. Reaching it means this module was not compiled " +
      '(e.g. hitlTool() used outside a "use generative" file).',
  );
}

/**
 * @deprecated Use {@link hitlTool}.
 */
export const hitl = hitlTool;
