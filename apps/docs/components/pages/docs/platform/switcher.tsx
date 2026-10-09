"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import type * as PageTree from "fumadocs-core/page-tree";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  Check,
  ChevronDown,
  Cloud,
  Droplet,
  LayoutGrid,
  Monitor,
  PanelsTopLeft,
  Smartphone,
  Terminal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getPlatformSwitchHref,
  isPlatform,
  PLATFORM_ENTRY_PATHS,
  PLATFORM_LABELS,
  PLATFORMS,
  type Platform,
  usePlatform,
} from "./context";
import { cn } from "@/lib/utils";
import { headerSwitcherClassName } from "@/components/shared/header-chrome";
import { getVisibleUrlsByPlatform } from "./tree";

const PLATFORM_ICONS: Record<Platform, typeof Monitor> = {
  react: Monitor,
  rn: Smartphone,
  ink: Terminal,
  vue: PanelsTopLeft,
  tap: Droplet,
  cloud: Cloud,
};

// Tap keeps its docs but is not offered as a platform to switch to.
const MENU_PLATFORMS = PLATFORMS.filter((p) => p !== "tap");

function getVisiblePlatformSwitchHref(
  visibleUrls: ReadonlySet<string>,
  pathname: string,
  nextPlatform: Platform,
): string {
  const equivalentHref = getPlatformSwitchHref(pathname, nextPlatform);
  if (equivalentHref && visibleUrls.has(equivalentHref)) {
    return equivalentHref;
  }

  if (visibleUrls.has(pathname)) {
    return pathname;
  }

  return PLATFORM_ENTRY_PATHS[nextPlatform];
}

export function PlatformSwitcher({
  tree,
  className,
}: {
  tree?: PageTree.Root | undefined;
  className?: string;
}) {
  const { platform, setPlatform } = usePlatform();
  const pathname = usePathname();
  const router = useRouter();
  const visibleUrlsByPlatform = useMemo(
    () => getVisibleUrlsByPlatform(tree),
    [tree],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn("group/platform", headerSwitcherClassName, className)}
      >
        <span
          data-docs-platform={platform}
          className="min-w-0 flex-1 truncate text-left"
        >
          {PLATFORM_LABELS[platform]}
        </span>
        <ChevronDown className="text-muted-foreground/70 size-3.5 shrink-0 transition-transform duration-150 ease-out group-data-[popup-open]/platform:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="min-w-52 rounded-lg p-1"
      >
        <DropdownMenuRadioGroup
          className="flex flex-col gap-0.5"
          value={platform}
          onValueChange={(next) => {
            if (!isPlatform(next)) return;
            const href = getVisiblePlatformSwitchHref(
              visibleUrlsByPlatform[next],
              pathname,
              next,
            );
            if (href !== pathname) router.replace(href);
            setPlatform(next);
          }}
        >
          {MENU_PLATFORMS.map(renderItem)}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <MenuPrimitive.Item
          closeOnClick
          onClick={() => router.push("/oss")}
          className={cn(
            "flex h-8 cursor-default items-center gap-2 rounded-sm px-2 text-[13px] tracking-tight transition-colors outline-none select-none",
            "data-[highlighted]:bg-foreground/5",
          )}
        >
          <LayoutGrid className="text-muted-foreground size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left">
            Other OSS projects
          </span>
          <span className="size-3.5 shrink-0" />
        </MenuPrimitive.Item>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  function renderItem(p: Platform) {
    const Icon = PLATFORM_ICONS[p];
    return (
      <MenuPrimitive.RadioItem
        key={p}
        value={p}
        closeOnClick
        className={cn(
          "flex h-8 cursor-default items-center gap-2 rounded-sm px-2 text-[13px] tracking-tight transition-colors outline-none select-none",
          "data-[highlighted]:bg-foreground/5 data-[checked]:bg-foreground/6 data-[checked]:font-medium",
        )}
      >
        <Icon className="text-muted-foreground size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">
          {PLATFORM_LABELS[p]}
        </span>
        <MenuPrimitive.RadioItemIndicator
          keepMounted
          className="flex shrink-0 data-[unchecked]:invisible"
        >
          <Check className="text-foreground size-3.5" />
        </MenuPrimitive.RadioItemIndicator>
      </MenuPrimitive.RadioItem>
    );
  }
}
