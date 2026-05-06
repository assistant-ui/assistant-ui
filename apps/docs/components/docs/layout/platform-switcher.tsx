"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  PLATFORM_LABELS,
  PLATFORMS,
  type Platform,
  usePlatform,
} from "@/components/docs/contexts/platform";
import { cn } from "@/lib/utils";

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

export function PlatformSwitcher() {
  const [open, setOpen] = useState(false);
  const { platform, setPlatform } = usePlatform();
  const pathname = usePathname();
  const router = useRouter();
  const selected = PLATFORM_OPTIONS[platform];

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
                const href = getPlatformSwitchHref(pathname, p);
                setPlatform(p);
                if (href && href !== pathname) router.replace(href);
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
