import { ArrowUpRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface MoreDropdownItem {
  label: string;
  href: string;
  external?: boolean;
}

export function MoreDropdown({ items }: { items: MoreDropdownItem[] }) {
  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 px-3 py-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
        >
          More
          <ChevronDown className="size-3" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-40 rounded-xl p-1 shadow-xs" align="end">
        <div className="flex flex-col">
          {items.map((item) =>
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                {item.label}
                <ArrowUpRight className="size-3 opacity-40" />
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                {item.label}
              </Link>
            ),
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
