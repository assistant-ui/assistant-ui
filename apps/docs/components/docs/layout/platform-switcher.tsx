"use client";

import { Check, ChevronDown, Smartphone, Square, Terminal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shared/dropdown-menu";
import {
  PLATFORM_LABELS,
  PLATFORMS,
  type Platform,
  usePlatform,
} from "@/components/docs/contexts/platform";
import { cn } from "@/lib/utils";

const ICONS: Record<Platform, typeof Square> = {
  react: Square,
  rn: Smartphone,
  ink: Terminal,
};

export function PlatformSwitcher() {
  const { platform, setPlatform } = usePlatform();
  const Icon = ICONS[platform];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-7 items-center gap-1.5 rounded-md border border-border/50 bg-muted/40 px-2 text-foreground/80 text-xs transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Select platform"
      >
        <Icon className="size-3.5" />
        <span>{PLATFORM_LABELS[platform]}</span>
        <ChevronDown className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        {PLATFORMS.map((p) => {
          const ItemIcon = ICONS[p];
          const active = p === platform;
          return (
            <DropdownMenuItem
              key={p}
              onSelect={() => setPlatform(p)}
              className={cn(
                "flex items-center gap-2 text-sm",
                active && "font-medium",
              )}
            >
              <ItemIcon className="size-4 text-muted-foreground" />
              <span className="flex-1">{PLATFORM_LABELS[p]}</span>
              {active && <Check className="size-3.5 text-foreground" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
