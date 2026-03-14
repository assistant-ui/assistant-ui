"use client";

import { memo, type ComponentProps, type FC } from "react";
import {
  ComposerPrimitive,
  unstable_useToolMentionAdapter,
} from "@assistant-ui/react";
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
  ...props
}: ComposerPrimitive.Unstable_MentionRoot.Props & {
  formatLabel?: (toolName: string) => string;
}) {
  const adapter = unstable_useToolMentionAdapter({ formatLabel });
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
  ...props
}: Omit<ComponentProps<"div">, "children">) {
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
              className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent"
            >
              <span className="flex items-center gap-2">
                <WrenchIcon className="size-4 text-muted-foreground" />
                {cat.label}
              </span>
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            </ComposerPrimitive.Unstable_MentionCategoryItem>
          ))}
          {categories.length === 0 && (
            <div className="px-3 py-2 text-muted-foreground text-sm">
              No tools available
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
  ...props
}: Omit<ComponentProps<"div">, "children">) {
  return (
    <ComposerPrimitive.Unstable_MentionItems>
      {(items) => (
        <div
          data-slot="composer-mention-items"
          className={cn("flex flex-col", className)}
          {...props}
        >
          <ComposerPrimitive.Unstable_MentionBack className="flex cursor-pointer items-center gap-1.5 border-b px-3 py-2 text-muted-foreground text-xs uppercase tracking-wide transition-colors hover:bg-accent">
            <ChevronLeftIcon className="size-3.5" />
            Tools
          </ComposerPrimitive.Unstable_MentionBack>

          <div className="py-1">
            {items.map((item) => (
              <ComposerPrimitive.Unstable_MentionItem
                key={item.id}
                item={item}
                className="flex w-full cursor-pointer flex-col items-start gap-0.5 px-3 py-2 text-left outline-none transition-colors hover:bg-accent focus:bg-accent"
              >
                <span className="flex items-center gap-2 font-medium text-sm">
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
                No matching tools
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

export {
  ComposerMentionPopover,
  ComposerMentionRoot,
  ComposerMentionPopoverRoot,
  ComposerMentionCategoriesContent,
  ComposerMentionItemsContent,
};
