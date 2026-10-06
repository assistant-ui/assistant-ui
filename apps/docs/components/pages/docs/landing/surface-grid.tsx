import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PLATFORM_LABELS, type Platform } from "@/lib/constants";

export const SURFACES: {
  platform: Platform;
  label: string;
  description: string;
  href: string;
}[] = [
  {
    platform: "react",
    label: PLATFORM_LABELS.react,
    description: "Web chat interfaces",
    href: "/docs/installation",
  },
  {
    platform: "rn",
    label: PLATFORM_LABELS.rn,
    description: "iOS and Android",
    href: "/docs/react-native",
  },
  {
    platform: "ink",
    label: PLATFORM_LABELS.ink,
    description: "Terminal apps",
    href: "/docs/ink",
  },
];

export function SurfaceGrid() {
  return (
    <div className="not-prose grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-3">
      {SURFACES.map((surface) => {
        return (
          <Link
            key={surface.platform}
            href={surface.href}
            className="group hover:bg-foreground/[0.025] focus-visible:outline-ring flex flex-col gap-1 px-2 py-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <span className="min-w-0 flex-1">{surface.label}</span>
              <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
            </span>
            <span className="text-muted-foreground text-sm leading-relaxed">
              {surface.description}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
