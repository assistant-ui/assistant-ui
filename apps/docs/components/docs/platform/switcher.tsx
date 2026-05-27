"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type * as PageTree from "fumadocs-core/page-tree";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "fumadocs-ui/components/ui/popover";
import {
  Check,
  ChevronsUpDown,
  Monitor,
  Smartphone,
  Terminal,
} from "lucide-react";
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
    description: string;
    Icon: typeof Monitor;
  }
> = {
  react: {
    label: PLATFORM_LABELS.react,
    description: "For React web apps",
    Icon: Monitor,
  },
  rn: {
    label: PLATFORM_LABELS.rn,
    description: "For React Native apps",
    Icon: Smartphone,
  },
  ink: {
    label: PLATFORM_LABELS.ink,
    description: "For Ink CLI apps",
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
          "bg-fd-secondary/50 text-fd-secondary-foreground hover:bg-fd-accent data-[state=open]:bg-fd-accent data-[state=open]:text-fd-accent-foreground mb-3 flex w-full items-center gap-2 rounded-lg border p-2 text-start transition-colors",
        )}
      >
        <div className="size-9 shrink-0 empty:hidden md:size-5">
          <selected.Icon className="text-muted-foreground size-4 translate-y-0.5" />
        </div>
        <div>
          <p className="text-sm font-medium">{selected.label}</p>
          <p className="text-fd-muted-foreground text-sm empty:hidden md:hidden">
            {selected.description}
          </p>
        </div>
        <ChevronsUpDown className="text-fd-muted-foreground ms-auto size-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent className="fd-scroll-container flex w-(--radix-popover-trigger-width) flex-col gap-1 p-1">
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
              className="hover:bg-fd-accent hover:text-fd-accent-foreground flex items-center gap-2 rounded-lg p-1.5 text-start"
            >
              <div className="size-9 shrink-0 empty:hidden md:mb-auto md:size-5">
                <item.Icon className="text-muted-foreground size-4 translate-y-0.5" />
              </div>
              <div>
                <p className="text-sm leading-none font-medium">{item.label}</p>
                <p className="text-fd-muted-foreground mt-1 text-[0.8125rem] empty:hidden">
                  {item.description}
                </p>
              </div>
              <Check
                className={cn(
                  "text-fd-primary ms-auto size-3.5 shrink-0",
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
