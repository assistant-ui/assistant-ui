import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { NavItem } from "@/lib/constants";

export function NavItems({ items }: { items: NavItem[] }) {
  return items.map((item) =>
    item.type === "link" ? (
      <Link
        key={item.href}
        href={item.href}
        className="px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
      >
        {item.label}
      </Link>
    ) : (
      <HoverCard key={item.label} openDelay={100} closeDelay={100}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className="px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            {item.label}
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-[28rem] rounded-xl p-2 shadow-xs">
          <div className="grid grid-cols-2">
            {item.items.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
                >
                  <span className="flex items-center gap-1.5 text-sm">
                    {link.label}
                    <ArrowUpRight className="size-3 opacity-40" />
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {link.description}
                  </span>
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex flex-col rounded-md px-2 py-1.5 transition-colors hover:bg-muted"
                >
                  <span className="text-sm">{link.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {link.description}
                  </span>
                </Link>
              ),
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    ),
  );
}
