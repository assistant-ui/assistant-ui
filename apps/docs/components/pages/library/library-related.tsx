import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

/** A link at the foot of a library page to the page that goes with it. */
export function LibraryRelated({
  heading,
  href,
  title,
  description,
}: {
  heading: string;
  href: string;
  title: string;
  description: string;
}) {
  return (
    <aside aria-labelledby="library-related" className="border-t pt-12 pb-12">
      <h2 id="library-related" className="mb-4 text-base font-medium">
        {heading}
      </h2>
      <Link
        href={href}
        className="group/related bg-foreground/[0.03] hover:bg-foreground/[0.05] dark:bg-foreground/[0.045] dark:hover:bg-foreground/[0.07] focus-visible:ring-ring flex items-center justify-between gap-6 rounded-[32px] px-7 py-6 transition-colors outline-none focus-visible:ring-2"
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-[13.5px] font-medium">{title}</span>
          <span className="text-muted-foreground text-[13px] leading-relaxed">
            {description}
          </span>
        </span>
        <ArrowRightIcon
          aria-hidden
          className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-hover/related:translate-x-0.5 motion-reduce:transition-none"
        />
      </Link>
    </aside>
  );
}
