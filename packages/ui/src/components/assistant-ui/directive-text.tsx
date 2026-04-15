"use client";

import { memo } from "react";
import type { TextMessagePartComponent } from "@assistant-ui/react";
import type { Unstable_DirectiveFormatter } from "@assistant-ui/core";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/core";
import { WrenchIcon } from "lucide-react";
import { Badge } from "./badge";

/**
 * Creates a `Text` message part component that parses `:type[label]{name=id}`
 * directives and renders them as inline chips. Pair with a
 * `Unstable_TriggerPopover` whose `onSelect` is
 * `{ type: "insertDirective", formatter }` using the same formatter.
 *
 * @example
 * ```tsx
 * const CustomDirectiveText = createDirectiveText(myFormatter);
 * <MessagePrimitive.Parts components={{ Text: CustomDirectiveText }} />
 * ```
 */
export function createDirectiveText(
  formatter: Unstable_DirectiveFormatter,
): TextMessagePartComponent {
  const Component: TextMessagePartComponent = ({ text }) => {
    const segments = formatter.parse(text);

    if (segments.length === 1 && segments[0]!.kind === "text") {
      return <>{text}</>;
    }

    return (
      <>
        {segments.map((seg, i) =>
          seg.kind === "text" ? (
            <span key={i} className="whitespace-pre-wrap">
              {seg.text}
            </span>
          ) : (
            <Badge
              key={i}
              variant="info"
              size="sm"
              data-slot="directive-text-chip"
              data-mention-type={seg.type}
              data-mention-id={seg.id}
              className="aui-mention-chip items-baseline text-[13px] leading-none [&_svg]:self-center"
            >
              {/* Customize icon per type in your own copy (shadcn pattern) */}
              {seg.type !== "command" && <WrenchIcon />}
              {seg.label}
            </Badge>
          ),
        )}
      </>
    );
  };
  Component.displayName = "DirectiveText";
  return Component;
}

const DirectiveTextImpl = createDirectiveText(
  unstable_defaultDirectiveFormatter,
);

/**
 * A `Text` message part component that parses `:type[label]{name=id}`
 * directives and renders them as inline chips. Use as the `Text` component in
 * `MessagePrimitive.Parts` for user messages.
 *
 * For custom formatters, use `createDirectiveText(formatter)` instead.
 *
 * @example
 * ```tsx
 * <MessagePrimitive.Parts components={{ Text: DirectiveText }} />
 * ```
 */
export const DirectiveText: TextMessagePartComponent = memo(DirectiveTextImpl);
