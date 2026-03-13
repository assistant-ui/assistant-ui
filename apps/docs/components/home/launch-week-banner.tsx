"use client";

import { CloudIcon, SmartphoneIcon, TerminalIcon } from "lucide-react";
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
] as const;

export function LaunchWeekBanner() {
  return (
    <div className="hidden shrink-0 md:flex md:flex-col md:items-end md:gap-4">
      <p className="shimmer font-medium text-muted-foreground text-xs uppercase tracking-widest">
        Launch Week
      </p>

      <div className="flex flex-col gap-1.5">
        {DAYS.map((day) => (
          <Link
            key={day.day}
            href={day.href}
            className="group flex items-center gap-3 rounded-lg border border-border/60 bg-background/80 py-2 pr-4 pl-3 backdrop-blur-sm transition-colors hover:border-border"
          >
            <day.icon className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
            <span className="font-medium text-sm">{day.title}</span>
          </Link>
        ))}
      </div>

      <Link
        href="/blog/2026-03-launch-week"
        className="text-muted-foreground text-xs transition-colors hover:text-foreground"
      >
        Read the blog →
      </Link>
    </div>
  );
}
