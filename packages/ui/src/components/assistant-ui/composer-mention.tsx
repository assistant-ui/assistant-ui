"use client";

import { memo, type ComponentProps, type FC } from "react";
import {
  ComposerPrimitive,
  unstable_useToolMentionAdapter,
  unstable_useMentionContext,
} from "@assistant-ui/react";
import type { TextMessagePartComponent } from "@assistant-ui/react";
import type { Unstable_DirectiveFormatter } from "@assistant-ui/core";
import { unstable_defaultDirectiveFormatter } from "@assistant-ui/core";
import { ChevronLeftIcon, ChevronRightIcon, WrenchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// Root — wraps Composer with mention context
// =============================================================================

const defaultFormatLabel = (name: string) =>
  name.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

function ComposerMentionRoot({
  children,
  formatLabel = defaultFormatLabel,
  categoryLabel,
  ...props
}: ComposerPrimitive.Unstable_MentionRoot.Props & {
  formatLabel?: (toolName: string) => string;
  /** Custom label for the tools category. @default "Tools" */
  categoryLabel?: string;
}) {
  const adapter = unstable_useToolMentionAdapter({
    formatLabel,
    categoryLabel,
  });
  return (
    <ComposerPrimitive.Unstable_MentionRoot adapter={adapter} {...props}>
      {children}
    </ComposerPrimitive.Unstable_MentionRoot>
  );
}

// =============================================================================
// Popover — floating container for the mention picker
// =============================================================================

function ComposerMentionPopoverRoot({
  className,
  ...props
}: ComponentProps<typeof ComposerPrimitive.Unstable_MentionPopover>) {
  return (
    <ComposerPrimitive.Unstable_MentionPopover
      data-slot="composer-mention-popover"
      className={cn(
        "aui-composer-mention-popover absolute bottom-full left-0 z-50 mb-2 w-64 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg",
        className,
      )}
      {...props}
    />
  );
}

// =============================================================================
// Categories — list of mention categories
// =============================================================================

function ComposerMentionCategoriesContent({
  className,
  emptyLabel = "No items available",
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  /** Label shown when no categories are available. @default "No items available" */
  emptyLabel?: string;
}) {
  return (
    <ComposerPrimitive.Unstable_MentionCategories>
      {(categories) => (
        <div
          data-slot="composer-mention-categories"
          className={cn("flex flex-col py-1", className)}
          {...props}
        >
          {categories.map((cat) => (
            <ComposerPrimitive.Unstable_MentionCategoryItem
              key={cat.id}
              categoryId={cat.id}
              className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent data-[highlighted]:bg-accent"
            >
              <span className="flex items-center gap-2">
                {/* Default icon — customize by copying this component (shadcn pattern) */}
                <WrenchIcon className="size-4 text-muted-foreground" />
                {cat.label}
              </span>
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            </ComposerPrimitive.Unstable_MentionCategoryItem>
          ))}
          {categories.length === 0 && (
            <div className="px-3 py-2 text-muted-foreground text-sm">
              {emptyLabel}
            </div>
          )}
        </div>
      )}
    </ComposerPrimitive.Unstable_MentionCategories>
  );
}

// =============================================================================
// Items — list of items within a category
// =============================================================================

function ComposerMentionItemsContent({
  className,
  backLabel = "Back",
  emptyLabel = "No matching items",
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  /** Label shown on the back button. @default "Back" */
  backLabel?: string;
  /** Label shown when no items match. @default "No matching items" */
  emptyLabel?: string;
}) {
  const { isSearchMode } = unstable_useMentionContext();

  return (
    <ComposerPrimitive.Unstable_MentionItems>
      {(items) => (
        <div
          data-slot="composer-mention-items"
          className={cn("flex flex-col", className)}
          {...props}
        >
          {!isSearchMode && (
            <ComposerPrimitive.Unstable_MentionBack className="flex cursor-pointer items-center gap-1.5 border-b px-3 py-2 text-muted-foreground text-xs uppercase tracking-wide transition-colors hover:bg-accent">
              <ChevronLeftIcon className="size-3.5" />
              {backLabel}
            </ComposerPrimitive.Unstable_MentionBack>
          )}

          <div className="py-1">
            {items.map((item) => (
              <ComposerPrimitive.Unstable_MentionItem
                key={item.id}
                item={item}
                className="flex w-full cursor-pointer flex-col items-start gap-0.5 px-3 py-2 text-left outline-none transition-colors hover:bg-accent focus:bg-accent data-[highlighted]:bg-accent"
              >
                <span className="flex items-center gap-2 font-medium text-sm">
                  {/* Default icon — customize by copying this component (shadcn pattern) */}
                  <WrenchIcon className="size-3.5 text-primary" />
                  {item.label}
                </span>
                {item.description && (
                  <span className="ml-5.5 text-muted-foreground text-xs leading-tight">
                    {item.description}
                  </span>
                )}
              </ComposerPrimitive.Unstable_MentionItem>
            ))}
            {items.length === 0 && (
              <div className="px-3 py-2 text-muted-foreground text-sm">
                {emptyLabel}
              </div>
            )}
          </div>
        </div>
      )}
    </ComposerPrimitive.Unstable_MentionItems>
  );
}

// =============================================================================
// ComposerMentionPopover — pre-built mention popover
// =============================================================================

/**
 * Mention popover that shows available tools when the user types `@` in the composer.
 *
 * Wrap the Composer with `ComposerMentionPopover.Root` and place
 * `ComposerMentionPopover` inside.
 *
 * @example
 * ```tsx
 * <ComposerMentionPopover.Root>
 *   <ComposerPrimitive.Root>
 *     <ComposerPrimitive.Input />
 *     <ComposerMentionPopover />
 *   </ComposerPrimitive.Root>
 * </ComposerMentionPopover.Root>
 * ```
 */
const ComposerMentionPopoverImpl: FC<
  ComponentProps<typeof ComposerMentionPopoverRoot>
> = ({ className, ...props }) => {
  return (
    <ComposerMentionPopoverRoot className={className} {...props}>
      <ComposerMentionCategoriesContent />
      <ComposerMentionItemsContent />
    </ComposerMentionPopoverRoot>
  );
};

const ComposerMentionPopover = memo(
  ComposerMentionPopoverImpl,
) as unknown as typeof ComposerMentionPopoverImpl & {
  Root: typeof ComposerMentionRoot;
  Popover: typeof ComposerMentionPopoverRoot;
  Categories: typeof ComposerMentionCategoriesContent;
  Items: typeof ComposerMentionItemsContent;
};

ComposerMentionPopover.displayName = "ComposerMentionPopover";
ComposerMentionPopover.Root = ComposerMentionRoot;
ComposerMentionPopover.Popover = ComposerMentionPopoverRoot;
ComposerMentionPopover.Categories = ComposerMentionCategoriesContent;
ComposerMentionPopover.Items = ComposerMentionItemsContent;

// =============================================================================
// DirectiveText — renders directive syntax as inline chips in messages
// =============================================================================

/**
 * Creates a `Text` message part component that parses `:type[label]{name=id}`
 * directives and renders them as inline chips.
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

/**
 * A `Text` message part component that parses `:type[label]{name=id}` directives
 * and renders them as inline chips. Use as the `Text` component in
 * `MessagePrimitive.Parts`.
 *
 * For custom formatters, use `createDirectiveText(formatter)` instead.
 *
 * @example
 * ```tsx
 * <MessagePrimitive.Parts components={{ Text: DirectiveText, Quote: QuoteBlock }} />
 * ```
 */
const DirectiveText = memo(
  createDirectiveText(unstable_defaultDirectiveFormatter),
) as unknown as TextMessagePartComponent;

DirectiveText.displayName = "DirectiveText";

export {
  ComposerMentionPopover,
  ComposerMentionRoot,
  ComposerMentionPopoverRoot,
  ComposerMentionCategoriesContent,
  ComposerMentionItemsContent,
  DirectiveText,
};
