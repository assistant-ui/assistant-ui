"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { NavigationMenu } from "radix-ui";
import { cn } from "@/lib/utils";
import type { DropdownItem, NavItem } from "@/lib/constants";

function DropdownLink({ link }: { link: DropdownItem }) {
  const className =
    "hover:bg-muted flex flex-col rounded-md px-2 py-1.5 transition-colors";

  return (
    <NavigationMenu.Link asChild>
      {link.external ? (
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
      )}
    </NavigationMenu.Link>
  );
}

function NavigationMenuViewport() {
  return (
    <div className="absolute inset-x-0 top-full overflow-clip">
      <NavigationMenu.Viewport className="bg-background border-border/60 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden border-b transition-[height] duration-200 data-[state=closed]:duration-150 data-[state=open]:duration-200 motion-reduce:animate-none motion-reduce:transition-none" />
    </div>
  );
}

export function NavItemsRoot({ children }: { children: ReactNode }) {
  const [value, setValue] = useState("");

  return (
    <NavigationMenu.Root
      value={value}
      onValueChange={setValue}
      delayDuration={100}
      data-menu-open={value !== ""}
      className="group relative w-full"
    >
      {children}
      <NavigationMenuViewport />
    </NavigationMenu.Root>
  );
}

export function NavItems({
  items,
  className,
}: {
  items: NavItem[];
  className?: string;
}) {
  return (
    <NavigationMenu.List
      className={cn("flex shrink-0 items-center", className)}
    >
      {items.map((item) => {
        if (item.type === "link") {
          return (
            <NavigationMenu.Item key={item.href}>
              <NavigationMenu.Link asChild>
                <Link
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground px-3 py-1.5 text-sm transition-colors"
                >
                  {item.label}
                </Link>
              </NavigationMenu.Link>
            </NavigationMenu.Item>
          );
        }

        return (
          <NavigationMenu.Item key={item.label}>
            <NavigationMenu.Trigger className="text-muted-foreground hover:text-foreground data-[state=open]:text-foreground group/trigger flex items-center gap-1 px-3 py-1.5 text-sm transition-colors">
              {item.label}
              <ChevronDown className="size-3 opacity-60 transition-[rotate] duration-200 group-data-[state=open]/trigger:rotate-180 motion-reduce:transition-none" />
            </NavigationMenu.Trigger>
            <NavigationMenu.Content className="w-full">
              <div className="mx-auto w-full max-w-7xl px-4 py-8">
                <div className="grid max-w-3xl grid-cols-3 gap-8">
                  {item.groups.map((group) => (
                    <div key={group.label} className="flex flex-col gap-1">
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
            </NavigationMenu.Content>
          </NavigationMenu.Item>
        );
      })}
    </NavigationMenu.List>
  );
}
