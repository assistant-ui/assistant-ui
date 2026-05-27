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
        className="text-muted-foreground hover:text-foreground px-3 py-1.5 text-sm transition-colors"
      >
        {item.label}
      </Link>
    ) : (
      <HoverCard key={item.label} openDelay={100} closeDelay={100}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground px-3 py-1.5 text-sm transition-colors"
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
                  className="hover:bg-muted flex flex-col rounded-md px-2 py-1.5 transition-colors"
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
                  className="hover:bg-muted flex flex-col rounded-md px-2 py-1.5 transition-colors"
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
