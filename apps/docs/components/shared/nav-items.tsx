import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { DropdownItem, NavItem } from "@/lib/constants";

function DropdownLink({ link }: { link: DropdownItem }) {
  const className =
    "hover:bg-muted flex flex-col rounded-md px-2 py-1.5 transition-colors";

  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        <span className="flex items-center gap-1.5 text-sm">
          {link.label}
          <ArrowUpRight className="size-3 opacity-40" />
        </span>
        <span className="text-muted-foreground text-xs">
          {link.description}
        </span>
      </a>
    );
  }

  return (
    <Link href={link.href} className={className}>
      <span className="text-sm">{link.label}</span>
      <span className="text-muted-foreground text-xs">{link.description}</span>
    </Link>
  );
}

export function NavItems({
  items,
  megaAlign = "start",
}: {
  items: NavItem[];
  megaAlign?: "start" | "end";
}) {
  return items.map((item) => {
    if (item.type === "link") {
      return (
        <Link
          key={item.href}
          href={item.href}
          className="text-muted-foreground hover:text-foreground px-3 py-1.5 text-sm transition-colors"
        >
          {item.label}
        </Link>
      );
    }

    const trigger = (
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground px-3 py-1.5 text-sm transition-colors"
        >
          {item.label}
        </button>
      </HoverCardTrigger>
    );

    return (
      <HoverCard key={item.label} openDelay={100} closeDelay={100}>
        {trigger}
        <HoverCardContent
          align={megaAlign}
          alignOffset={megaAlign === "end" ? -130 : -52}
          className="w-[44rem] rounded-xl p-3 shadow-xs"
        >
          <div className="grid grid-cols-3 gap-2">
            {item.groups.map((group) => (
              <div key={group.label} className="flex flex-col gap-1">
                <span className="text-muted-foreground px-2 pb-1 text-xs font-medium">
                  {group.label}
                </span>
                {group.items.map((link) => (
                  <DropdownLink key={link.href} link={link} />
                ))}
              </div>
            ))}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  });
}
