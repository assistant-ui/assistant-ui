"use client";

import type { ReactNode, ComponentProps, ReactElement } from "react";
import { isValidElement } from "react";
import { Menu } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

function DropdownMenu(props: Menu.Root.Props) {
  return <Menu.Root {...props} />;
}

function DropdownMenuTrigger({
  className,
  asChild,
  children,
  ...props
}: ComponentProps<typeof Menu.Trigger> & { asChild?: boolean }) {
  const mergedClassName = cn(
    "flex items-center justify-center rounded-md transition-colors outline-none",
    "text-muted-foreground hover:bg-muted hover:text-foreground",
    "focus-visible:ring-ring/50 focus-visible:ring-2",
    className,
  );

  if (asChild && isValidElement(children)) {
    return (
      <Menu.Trigger
        className={mergedClassName}
        render={children as ReactElement}
        {...props}
      />
    );
  }

  return (
    <Menu.Trigger className={mergedClassName} {...props}>
      {children}
    </Menu.Trigger>
  );
}

function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = "end",
  side,
  children,
  ...props
}: ComponentProps<typeof Menu.Popup> &
  Pick<Menu.Positioner.Props, "align" | "sideOffset" | "side">) {
  return (
    <Menu.Portal>
      <Menu.Positioner
        sideOffset={sideOffset}
        align={align}
        {...(side !== undefined ? { side } : {})}
      >
        <Menu.Popup
          className={cn(
            "bg-popover/95 text-popover-foreground z-50 min-w-40 overflow-hidden rounded-xl border p-1.5 shadow-lg backdrop-blur-sm focus-visible:shadow-lg",
            "data-open:fade-in-0 data-open:zoom-in-95 data-open:animate-in",
            "data-closed:fade-out-0 data-closed:zoom-out-95 data-closed:animate-out",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            className,
          )}
          {...props}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

interface DropdownMenuItemProps extends Omit<
  ComponentProps<typeof Menu.Item>,
  "onSelect"
> {
  icon?: ReactNode;
  asChild?: boolean;
  onSelect?: (event: Event) => void;
}

const itemClassName =
  "flex cursor-default select-none items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none transition-colors text-muted-foreground focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50";

function DropdownMenuItem({
  className,
  icon,
  children,
  asChild,
  onSelect,
  onClick,
  ...props
}: DropdownMenuItemProps) {
  const handleClick: ComponentProps<typeof Menu.Item>["onClick"] = (event) => {
    onSelect?.(event.nativeEvent);
    onClick?.(event);
  };

  if (asChild && isValidElement(children)) {
    return (
      <Menu.Item
        className={cn(itemClassName, className)}
        render={children as ReactElement}
        onClick={handleClick}
        {...props}
      />
    );
  }

  return (
    <Menu.Item
      className={cn(itemClassName, className)}
      onClick={handleClick}
      {...props}
    >
      {icon && (
        <span className="flex size-4 items-center justify-center">{icon}</span>
      )}
      {children}
    </Menu.Item>
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof Menu.Separator>) {
  return (
    <Menu.Separator
      className={cn("bg-border my-1 h-px", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
};
