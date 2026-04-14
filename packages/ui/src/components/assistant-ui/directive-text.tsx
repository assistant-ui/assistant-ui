"use client";

import { memo } from "react";
import type { TextMessagePartComponent } from "@assistant-ui/react";
import type { Unstable_DirectiveFormatter } from "@assistant-ui/core";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/core";
import { WrenchIcon } from "lucide-react";

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
            <span
              key={i}
              data-slot="directive-text-chip"
              className="aui-mention-chip mx-0.5 inline-flex translate-y-[-1px] items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 font-medium text-[13px] text-primary leading-none"
              data-mention-type={seg.type}
              data-mention-id={seg.id}
            >
              {/* Customize icon per type in your own copy (shadcn pattern) */}
              <WrenchIcon className="size-3 shrink-0" />
              {seg.label}
            </span>
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
