import Link from "next/link";
import { ArrowRight, Monitor, Smartphone, Terminal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PLATFORM_LABELS, type Platform } from "@/lib/constants";

export const SURFACES: {
  platform: Platform;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}[] = [
  {
    platform: "react",
    label: PLATFORM_LABELS.react,
    description: "Web chat interfaces",
    href: "/docs/installation",
    icon: Monitor,
  },
  {
    platform: "rn",
    label: PLATFORM_LABELS.rn,
    description: "iOS and Android",
    href: "/docs/react-native",
    icon: Smartphone,
  },
  {
    platform: "ink",
    label: PLATFORM_LABELS.ink,
    description: "Terminal apps",
    href: "/docs/ink",
    icon: Terminal,
  },
];

export function SurfaceGrid() {
  return (
    <div className="not-prose grid grid-cols-1 gap-2 sm:grid-cols-3">
      {SURFACES.map((surface) => {
        const Icon = surface.icon;
        return (
          <Link
            key={surface.platform}
            href={surface.href}
            className="group border-border/60 hover:border-foreground/15 hover:bg-muted/50 focus-visible:ring-foreground/20 flex flex-col gap-1.5 rounded-xl border px-4 py-4 transition-colors outline-none focus-visible:ring-1"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Icon className="text-muted-foreground size-4" />
              <span className="min-w-0 flex-1">{surface.label}</span>
              <ArrowRight className="text-muted-foreground size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="text-muted-foreground text-xs">
              {surface.description}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
