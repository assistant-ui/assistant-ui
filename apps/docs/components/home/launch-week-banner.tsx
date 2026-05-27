"use client";

import {
  CloudIcon,
  FlameIcon,
  SparklesIcon,
  ZapIcon,
  SmartphoneIcon,
  TerminalIcon,
} from "lucide-react";
import Link from "next/link";

const DAYS = [
  { day: 1, title: "React Native", href: "/native", icon: SmartphoneIcon },
  { day: 2, title: "React Ink", href: "/ink", icon: TerminalIcon },
  {
    day: 3,
    title: "Cloud Redesign",
    href: "/blog/2026-03-launch-week#day-3--assistant-cloud-redesign",
    icon: CloudIcon,
  },
  { day: 4, title: "tw-shimmer", href: "/tw-shimmer", icon: SparklesIcon },
  {
    day: 5,
    title: "useCloudChat",
    href: "/cloud-ai-sdk",
    icon: ZapIcon,
  },
  { day: 6, title: "Heat Graph", href: "/heat-graph", icon: FlameIcon },
] as const;

export function LaunchWeekBanner() {
  return (
    <div className="hidden shrink-0 md:flex md:flex-col md:items-end md:gap-4">
      <p className="shimmer text-muted-foreground text-xs font-medium tracking-widest uppercase">
        Launch Week
      </p>

      <div className="flex max-w-[340px] flex-wrap justify-end gap-1.5">
        {DAYS.map((day) => (
          <Link
            key={day.day}
            href={day.href}
            className="group border-border/60 bg-background/80 hover:border-border flex items-center gap-3 rounded-lg border py-2 pr-4 pl-3 backdrop-blur-sm transition-colors"
          >
            <day.icon className="text-muted-foreground group-hover:text-foreground size-4 transition-colors" />
            <span className="text-sm font-medium">{day.title}</span>
          </Link>
        ))}
      </div>

      <Link
        href="/blog/2026-03-launch-week"
        className="text-muted-foreground hover:text-foreground text-xs transition-colors"
      >
        Read the blog →
      </Link>
    </div>
  );
}
