"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuPopup,
  NavigationMenuPortal,
  NavigationMenuPositioner,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";
import type { DropdownItem, NavItem } from "@/lib/constants";

function DropdownLink({ link }: { link: DropdownItem }) {
  const className =
    "hover:bg-muted flex flex-col rounded-md px-2 py-1.5 transition-colors";

  return (
    <NavigationMenuLink
      render={
        link.external ? (
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
          >
            <span className="flex items-center gap-1.5 text-sm">
              {link.label}
              <ArrowUpRight className="size-3 opacity-40" />
            </span>
            <span className="text-muted-foreground text-xs">
              {link.description}
            </span>
          </a>
        ) : (
          <Link href={link.href} className={className}>
            <span className="text-sm">{link.label}</span>
            <span className="text-muted-foreground text-xs">
              {link.description}
            </span>
          </Link>
        )
      }
    />
  );
}

export function NavItemsRoot({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const open = value !== null;

  return (
    <NavigationMenu
      ref={rootRef}
      value={value}
      onValueChange={(next) => setValue(next as string | null)}
      delay={100}
      data-menu-open={open}
      className="group relative w-full"
    >
      <div
        aria-hidden
        className={cn(
          "bg-background/70 pointer-events-none fixed inset-0 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      {children}
      <NavigationMenuPortal>
        <NavigationMenuPositioner
          anchor={rootRef}
          side="bottom"
          align="start"
          sideOffset={0}
          collisionAvoidance={{ side: "none", align: "none" }}
          className="z-[60] hidden w-[var(--anchor-width)] md:block"
        >
          <NavigationMenuPopup className="bg-background h-[var(--popup-height)] w-full overflow-hidden transition-[height,opacity] duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none">
            <NavigationMenuViewport />
          </NavigationMenuPopup>
        </NavigationMenuPositioner>
      </NavigationMenuPortal>
    </NavigationMenu>
  );
}

export function NavItems({
  items,
  className,
  contentClassName,
  menuAlign = "spread",
}: {
  items: NavItem[];
  className?: string;
  contentClassName?: string;
  menuAlign?: "spread" | "end";
}) {
  // Headers render this list twice for responsive breakpoints. Both stay
  // mounted, so item values must not collide or every copy opens at once.
  const instanceId = useId();

  return (
    <NavigationMenuList className={cn("flex shrink-0 items-center", className)}>
      {items.map((item) => {
        if (item.type === "link") {
          return (
            <NavigationMenuItem
              key={item.href}
              value={`${instanceId}:${item.href}`}
            >
              <NavigationMenuLink
                render={
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground px-3 py-1.5 text-sm transition-colors"
                  >
                    {item.label}
                  </Link>
                }
              />
            </NavigationMenuItem>
          );
        }

        return (
          <NavigationMenuItem
            key={item.label}
            value={`${instanceId}:${item.label}`}
          >
            <NavigationMenuTrigger className="text-muted-foreground hover:text-foreground data-[popup-open]:text-foreground group/trigger flex cursor-pointer items-center gap-1 px-3 py-1.5 text-sm transition-colors">
              {item.label}
              <ChevronDown className="size-3 opacity-60 transition-[rotate] duration-200 group-data-[popup-open]/trigger:rotate-180 motion-reduce:transition-none" />
            </NavigationMenuTrigger>
            <NavigationMenuContent className="w-full">
              <div
                className={cn(
                  "w-full px-4 py-8",
                  menuAlign === "end" && "flex justify-end",
                  contentClassName,
                )}
              >
                <div
                  className={cn(
                    "grid grid-cols-4",
                    menuAlign === "end" ? "gap-x-12" : "gap-x-6 lg:gap-x-8",
                  )}
                >
                  {item.groups.map((group) => (
                    <div
                      key={group.label}
                      className={cn(
                        "flex flex-col gap-1",
                        menuAlign === "end" && "w-48",
                      )}
                    >
                      <span className="text-muted-foreground px-2 pb-2 text-xs font-medium">
                        {group.label}
                      </span>
                      {group.items.map((link) => (
                        <DropdownLink key={link.href} link={link} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
        );
      })}
    </NavigationMenuList>
  );
}
