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
} from "@/components/docs/contexts/platform";
import { cn } from "@/lib/utils";
import { buildPlatformSections, isNodeVisible } from "./platform-tree";

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

function isPathVisibleForPlatform(
  visibleUrls: ReadonlySet<string>,
  pathname: string,
): boolean {
  return visibleUrls.has(pathname);
}

function collectVisibleUrls(
  node: PageTree.Node,
  platform: Platform,
  urls: Set<string>,
): void {
  if (!isNodeVisible(node, platform)) return;

  if (node.type === "page") {
    urls.add(node.url);
    return;
  }

  if (node.type === "separator") return;

  if (node.index && isNodeVisible(node.index, platform)) {
    urls.add(node.index.url);
  }

  node.children.forEach((child) => {
    collectVisibleUrls(child, platform, urls);
  });
}

function getVisibleUrlsByPlatform(
  tree: PageTree.Root | undefined,
): Record<Platform, ReadonlySet<string>> {
  const folders = (tree?.children ?? []).filter(
    (node): node is PageTree.Folder => node.type === "folder",
  );
  const result: Record<Platform, Set<string>> = {
    react: new Set(),
    rn: new Set(),
    ink: new Set(),
  };

  PLATFORMS.forEach((platform) => {
    buildPlatformSections(folders, platform).forEach((section) => {
      collectVisibleUrls(section, platform, result[platform]);
    });
  });

  return result;
}

function getVisiblePlatformSwitchHref(
  visibleUrls: ReadonlySet<string>,
  pathname: string,
  nextPlatform: Platform,
): string {
  const equivalentHref = getPlatformSwitchHref(pathname, nextPlatform);
  if (equivalentHref && isPathVisibleForPlatform(visibleUrls, equivalentHref)) {
    return equivalentHref;
  }

  if (isPathVisibleForPlatform(visibleUrls, pathname)) {
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
          "mb-3 flex w-full items-center gap-2 rounded-lg border bg-fd-secondary/50 p-2 text-start text-fd-secondary-foreground transition-colors hover:bg-fd-accent data-[state=open]:bg-fd-accent data-[state=open]:text-fd-accent-foreground",
        )}
      >
        <div className="size-9 shrink-0 empty:hidden md:size-5">
          <selected.Icon className="size-4 translate-y-0.5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm">{selected.label}</p>
          <p className="text-fd-muted-foreground text-sm empty:hidden md:hidden">
            {selected.description}
          </p>
        </div>
        <ChevronsUpDown className="ms-auto size-4 shrink-0 text-fd-muted-foreground" />
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
              className="flex items-center gap-2 rounded-lg p-1.5 text-start hover:bg-fd-accent hover:text-fd-accent-foreground"
            >
              <div className="size-9 shrink-0 empty:hidden md:mb-auto md:size-5">
                <item.Icon className="size-4 translate-y-0.5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm leading-none">{item.label}</p>
                <p className="mt-1 text-[0.8125rem] text-fd-muted-foreground empty:hidden">
                  {item.description}
                </p>
              </div>
              <Check
                className={cn(
                  "ms-auto size-3.5 shrink-0 text-fd-primary",
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
