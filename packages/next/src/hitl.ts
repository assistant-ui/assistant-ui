/**
 * Marks a tool as **human-in-the-loop**: the agent pauses and the UI (`render`)
 * supplies the result instead of code. Use it as the tool's `execute`:
 *
 * ```tsx
 * confirm: { execute: hitl(), render: (props) => <Confirm {...props} /> }
 * ```
 *
 * Like {@link defineToolkit}, it has **no runtime implementation**: the
 * `@assistant-ui/next` compiler detects `execute: hitl()`, drops it, and stamps
 * the tool `type: "human"`. Reaching it at runtime means the module wasn't
 * compiled (used outside a `"use generative"` file), so it throws.
 */
export function hitl(): never {
  throw new Error(
    "[assistant-ui/next] hitl() has no runtime implementation — it marks a " +
      "human-in-the-loop tool and is stripped at build time by the " +
      "use-generative compiler. Reaching it means this module was not compiled " +
      '(e.g. hitl() used outside a "use generative" file).',
  );
}
