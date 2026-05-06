"use client";

import { MessagePrimitive } from "@assistant-ui/react";
import { componentsAllowlist } from "@/components/gui";

const UnknownComponentFallback = ({ component }: { component: string }) => (
  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
    unknown component: {component}
  </span>
);

/**
 * Renders an assistant message — text parts go through the standard
 * primitive defaults, and any `generative-ui` parts are resolved against
 * the allowlist.
 *
 * Demonstrates the cleanest API surface:
 *
 * ```tsx
 * <MessagePrimitive.Parts
 *   components={{ generativeUI: { components: componentsAllowlist } }}
 * />
 * ```
 *
 * The allowlist is the security boundary in the same-realm path —
 * any spec referencing a name outside `componentsAllowlist` will throw
 * `GenerativeUIRenderError`. Set `sandbox: "iframe"` to additionally run
 * the rendered tree inside an isolated document.
 */
export function GenerativeUIMessage() {
  return (
    <div className="aui-assistant-message">
      <MessagePrimitive.Parts
        components={{
          generativeUI: {
            components: componentsAllowlist,
            sandbox: "same-realm",
            Fallback: UnknownComponentFallback,
          },
        }}
      />
    </div>
  );
}
