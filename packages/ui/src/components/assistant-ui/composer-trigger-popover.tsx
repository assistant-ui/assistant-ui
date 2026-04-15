"use client";

import { memo, type ComponentPropsWithoutRef, type FC } from "react";
import { ComposerPrimitive } from "@assistant-ui/react";
import { ChevronLeftIcon, ChevronRightIcon, SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type IconComponent = FC<{ className?: string }>;

type ComposerTriggerPopoverProps = Omit<
  ComponentPropsWithoutRef<typeof ComposerPrimitive.Unstable_TriggerPopover>,
  "children"
> & {
  /** Maps an `item.icon` / `category.icon` string to an icon component. */
  iconMap?: Record<string, IconComponent>;
  /** Fallback icon when no entry in `iconMap` matches. */
  fallbackIcon?: IconComponent;
  /** Label shown on the back button. @default "Back" */
  backLabel?: string;
  /** Label shown when no categories are available. @default "No items available" */
  emptyCategoriesLabel?: string;
  /** Label shown when no items match. @default "No matching items" */
  emptyItemsLabel?: string;
};

function resolveIcon(
  iconKey: string | undefined,
  iconMap: Record<string, IconComponent> | undefined,
  fallback: IconComponent,
): IconComponent {
  if (iconKey && iconMap?.[iconKey]) return iconMap[iconKey]!;
  return fallback;
}

type CategoriesProps = {
  iconMap: Record<string, IconComponent> | undefined;
  fallbackIcon: IconComponent;
  emptyLabel: string;
};

const Categories: FC<CategoriesProps> = ({
  iconMap,
  fallbackIcon,
  emptyLabel,
}) => (
  <ComposerPrimitive.Unstable_TriggerPopoverCategories>
    {(categories) => (
      <div
        data-slot="composer-trigger-popover-categories"
        className="flex flex-col py-1"
      >
        {categories.map((cat) => {
          const Icon = resolveIcon(cat.icon, iconMap, fallbackIcon);
          return (
            <ComposerPrimitive.Unstable_TriggerPopoverCategoryItem
              key={cat.id}
              categoryId={cat.id}
              className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm outline-none transition-colors hover:bg-accent focus:bg-accent data-[highlighted]:bg-accent"
            >
              <span className="flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" />
                {cat.label}
              </span>
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            </ComposerPrimitive.Unstable_TriggerPopoverCategoryItem>
          );
        })}
        {categories.length === 0 && (
          <div className="px-3 py-2 text-muted-foreground text-sm">
            {emptyLabel}
          </div>
        )}
      </div>
    )}
  </ComposerPrimitive.Unstable_TriggerPopoverCategories>
);

type ItemsProps = {
  iconMap: Record<string, IconComponent> | undefined;
  fallbackIcon: IconComponent;
  backLabel: string;
  emptyLabel: string;
};

const Items: FC<ItemsProps> = ({
  iconMap,
  fallbackIcon,
  backLabel,
  emptyLabel,
}) => {
  return (
    <ComposerPrimitive.Unstable_TriggerPopoverItems>
      {(items) => (
        <div
          data-slot="composer-trigger-popover-items"
          className="flex flex-col"
        >
          <ComposerPrimitive.Unstable_TriggerPopoverBack className="flex cursor-pointer items-center gap-1.5 border-b px-3 py-2 text-muted-foreground text-xs uppercase tracking-wide transition-colors hover:bg-accent">
            <ChevronLeftIcon className="size-3.5" />
            {backLabel}
          </ComposerPrimitive.Unstable_TriggerPopoverBack>

          <div className="py-1">
            {items.map((item, index) => {
              const Icon = resolveIcon(item.icon, iconMap, fallbackIcon);
              return (
                <ComposerPrimitive.Unstable_TriggerPopoverItem
                  key={item.id}
                  item={item}
                  index={index}
                  className="flex w-full cursor-pointer flex-col items-start gap-0.5 px-3 py-2 text-left outline-none transition-colors hover:bg-accent focus:bg-accent data-[highlighted]:bg-accent"
                >
                  <span className="flex items-center gap-2 font-medium text-sm">
                    <Icon className="size-3.5 text-primary" />
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="ml-5.5 text-muted-foreground text-xs leading-tight">
                      {item.description}
                    </span>
                  )}
                </ComposerPrimitive.Unstable_TriggerPopoverItem>
              );
            })}
            {items.length === 0 && (
              <div className="px-3 py-2 text-muted-foreground text-sm">
                {emptyLabel}
              </div>
            )}
          </div>
        </div>
      )}
    </ComposerPrimitive.Unstable_TriggerPopoverItems>
  );
};

/**
 * Pre-built popover UI for a trigger-driven picker (`@` mentions, `/` slash
 * commands, `:` emoji, etc.). Renders categories, items, and a back button,
 * all driven by the `adapter` and `onSelect` behavior you pass in.
 *
 * Must be placed inside `ComposerPrimitive.Unstable_TriggerPopoverRoot`.
 *
 * @example
 * ```tsx
 * // @ mention
 * <ComposerTriggerPopover
 *   triggerId="mention"
 *   char="@"
 *   adapter={mentionAdapter}
 *   onSelect={{ type: "insertDirective", formatter }}
 *   fallbackIcon={WrenchIcon}
 * />
 *
 * // / slash command
 * <ComposerTriggerPopover
 *   triggerId="slash"
 *   char="/"
 *   adapter={slashAdapter}
 *   onSelect={{ type: "action", handler: (item) => item.execute?.() }}
 *   iconMap={{ FileText: FileTextIcon }}
 *   fallbackIcon={SlashIcon}
 * />
 * ```
 */
const ComposerTriggerPopoverImpl: FC<ComposerTriggerPopoverProps> = ({
  iconMap,
  fallbackIcon = SparklesIcon,
  backLabel = "Back",
  emptyCategoriesLabel = "No items available",
  emptyItemsLabel = "No matching items",
  className,
  ...props
}) => {
  return (
    <ComposerPrimitive.Unstable_TriggerPopover
      data-slot="composer-trigger-popover"
      className={cn(
        "aui-composer-trigger-popover absolute bottom-full left-0 z-50 mb-2 w-64 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg",
        className,
      )}
      {...props}
    >
      <Categories
        iconMap={iconMap}
        fallbackIcon={fallbackIcon}
        emptyLabel={emptyCategoriesLabel}
      />
      <Items
        iconMap={iconMap}
        fallbackIcon={fallbackIcon}
        backLabel={backLabel}
        emptyLabel={emptyItemsLabel}
      />
    </ComposerPrimitive.Unstable_TriggerPopover>
  );
};
ComposerTriggerPopoverImpl.displayName = "ComposerTriggerPopover";

export const ComposerTriggerPopover = memo(ComposerTriggerPopoverImpl);
