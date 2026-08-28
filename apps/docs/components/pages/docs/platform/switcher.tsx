"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type * as PageTree from "fumadocs-core/page-tree";
import {
  Check,
  ChevronDown,
  Monitor,
  Smartphone,
  Terminal,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getPlatformSwitchHref,
  PLATFORM_DOC_BASE_PATHS,
  PLATFORM_LABELS,
  PLATFORMS,
  type Platform,
  usePlatform,
} from "./context";
import { cn } from "@/lib/utils";
import { getVisibleUrlsByPlatform } from "./tree";

const PLATFORM_OPTIONS: Record<
  Platform,
  {
    label: string;
    Icon: typeof Monitor;
  }
> = {
  react: {
    label: PLATFORM_LABELS.react,
    Icon: Monitor,
  },
  rn: {
    label: PLATFORM_LABELS.rn,
    Icon: Smartphone,
  },
  ink: {
    label: PLATFORM_LABELS.ink,
    Icon: Terminal,
  },
};

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

  return PLATFORM_DOC_BASE_PATHS[nextPlatform];
}

export function PlatformSwitcher({
  tree,
}: {
  tree?: PageTree.Root | undefined;
}) {
  const [open, setOpen] = useState(false);
  const { platform, setPlatform } = usePlatform();
  const pathname = usePathname();
  const router = useRouter();
  const selected = PLATFORM_OPTIONS[platform];
  const visibleUrlsByPlatform = useMemo(
    () => getVisibleUrlsByPlatform(tree),
    [tree],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "mb-3 flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-[13px] font-medium tracking-tight transition-colors outline-none",
          "bg-muted/70 text-foreground hover:bg-muted data-open:bg-muted",
          "focus-visible:ring-foreground/20 focus-visible:ring-1",
        )}
      >
        <selected.Icon className="text-muted-foreground size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">
          {selected.label}
        </span>
        <ChevronDown
          className={cn(
            "text-muted-foreground/70 size-3.5 shrink-0 transition-transform duration-150 ease-out",
            open && "rotate-180",
          )}
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-(--anchor-width) gap-0.5 rounded-lg p-1"
      >
        {PLATFORMS.map((p) => {
          const item = PLATFORM_OPTIONS[p];
          const isActive = p === platform;
          return (
            <button
              key={p}
              type="button"
              onClick={() => {
                const href = getVisiblePlatformSwitchHref(
                  visibleUrlsByPlatform[p],
                  pathname,
                  p,
                );
                if (href !== pathname) router.replace(href);
                setPlatform(p);
                setOpen(false);
              }}
              className={cn(
                "flex h-8 w-full items-center gap-2 rounded-sm px-2 text-[13px] tracking-tight transition-colors",
                "hover:bg-foreground/5",
                isActive && "bg-foreground/6 font-medium",
              )}
            >
              <item.Icon className="text-muted-foreground size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-left">
                {item.label}
              </span>
              <Check
                className={cn(
                  "text-foreground size-3.5 shrink-0",
                  !isActive && "invisible",
                )}
              />
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
