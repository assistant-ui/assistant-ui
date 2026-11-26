import type { ReactNode } from "react";
import { typeDeck, typeSection } from "@/components/shared/type";
import { cn } from "@/lib/utils";

/**
 * A page section: its title and line on the left, a small interactive panel
 * on the right (under the copy on a phone), then whatever the section lists.
 */
export function PageSection({
  id,
  title,
  deck,
  links,
  panel,
  children,
}: {
  id: string;
  title: ReactNode;
  deck?: ReactNode;
  /** Quiet links under the line. */
  links?: ReactNode;
  panel?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="border-foreground/10 mt-16 scroll-mt-24 border-t pt-12 md:mt-20 md:pt-16"
    >
      <div
        className={cn(
          "grid items-center gap-10 lg:gap-16",
          panel && "lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]",
        )}
      >
        <div className="flex max-w-2xl flex-col gap-3">
          <h2 id={`${id}-heading`} className={typeSection}>
            {title}
          </h2>
          {deck ? <p className={cn(typeDeck, "max-w-[52ch]")}>{deck}</p> : null}
          {links ? (
            <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-[13px]">
              {links}
            </div>
          ) : null}
        </div>
        {panel ? <div className="min-w-0">{panel}</div> : null}
      </div>
      {children}
    </section>
  );
}
