import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import type { ReactNode } from "react";

export type OverviewItem = {
  name: string;
  line: string;
  href: string;
  icon?: ReactNode;
  /** A count or label after the name, such as "17". */
  meta?: string;
};

const panel =
  "bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document flex flex-col p-1.5";

/** An overview page's aside: what the page collects, each linking to its page or section. */
export function OverviewIndex({
  label,
  items,
}: {
  label: string;
  items: readonly OverviewItem[];
}) {
  return (
    <nav aria-label={label} className={panel}>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group/row hover:bg-foreground/[0.04] focus-visible:ring-ring flex items-center gap-3 rounded-md px-2.5 py-2 transition-colors outline-none focus-visible:ring-2"
            >
              {item.icon ? (
                <span
                  aria-hidden
                  className="border-foreground/10 bg-background rounded-document grid size-9 shrink-0 place-items-center border [&_svg]:h-5 [&_svg]:w-6"
                >
                  {item.icon}
                </span>
              ) : null}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-baseline gap-2 text-sm font-medium">
                  {item.name}
                  {item.meta ? (
                    <span className="text-muted-foreground text-xs font-normal tabular-nums">
                      {item.meta}
                    </span>
                  ) : null}
                </span>
                <span className="text-muted-foreground truncate text-[13px]">
                  {item.line}
                </span>
              </span>
              <ArrowRightIcon
                aria-hidden
                className="text-muted-foreground group-hover/row:text-foreground size-3.5 shrink-0 transition-transform group-hover/row:translate-x-0.5 motion-reduce:transition-none"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
