"use client";

import type { MouseEvent } from "react";
import { usePathname } from "next/navigation";
import { SidebarProvider as FumadocsSidebarProvider } from "fumadocs-ui/components/sidebar/base";
import { SidebarTabsDropdown } from "fumadocs-ui/components/sidebar/tabs/dropdown";
import { Monitor, Smartphone, Terminal } from "lucide-react";
import {
  PLATFORM_LABELS,
  PLATFORMS,
  type Platform,
  usePlatform,
} from "@/components/docs/contexts/platform";

const PLATFORM_DESCRIPTIONS: Record<Platform, string> = {
  react: "For React web apps",
  rn: "For React Native apps",
  ink: "For Ink CLI apps",
};

const PLATFORM_ICONS: Record<Platform, typeof Monitor> = {
  react: Monitor,
  rn: Smartphone,
  ink: Terminal,
};

export function PlatformSwitcher() {
  const pathname = usePathname();
  const { platform, setPlatform } = usePlatform();

  const options = PLATFORMS.map((p) => {
    const Icon = PLATFORM_ICONS[p];

    return {
      title: PLATFORM_LABELS[p],
      description: PLATFORM_DESCRIPTIONS[p],
      icon: <Icon className="size-4 translate-y-0.5 text-muted-foreground" />,
      url: `${pathname}#platform-${p}`,
      urls: p === platform ? new Set([pathname]) : new Set<string>(),
      props: {
        onClickCapture: (event: MouseEvent<HTMLAnchorElement>) => {
          event.preventDefault();
          setPlatform(p);
        },
      },
    };
  });

  return (
    <FumadocsSidebarProvider>
      <SidebarTabsDropdown
        options={options}
        className="mb-3 w-full rounded-md"
      />
    </FumadocsSidebarProvider>
  );
}
