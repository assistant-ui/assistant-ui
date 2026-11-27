import Link from "next/link";
import { CopyCommandButton } from "@/components/shared/copy-command-button";
import { typeDeck, typeSection } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import { LIBRARY_SECTIONS, sectionCount } from "@/lib/library/library-data";

const PREVIEW_SIZE = 6;

export function LibraryCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {LIBRARY_SECTIONS.map((section) => (
        <section
          key={section.id}
          aria-labelledby={section.id}
          className="rounded-document bg-foreground/[0.025] dark:bg-foreground/[0.04] flex flex-col gap-6 p-6"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id={section.id} className={typeSection}>
                <Link
                  href={section.href}
                  className="decoration-foreground/30 underline-offset-4 hover:underline"
                >
                  {section.title}
                </Link>
              </h2>
              <span className="text-muted-foreground tabular-nums">
                {sectionCount(section)}
              </span>
            </div>
            <p className={typeDeck}>{section.description}</p>
          </div>
          <dl className="flex flex-col gap-4 text-sm">
            {section.groups.map((group) => (
              <div key={group.label} className="flex flex-col gap-1">
                <dt
                  className={cn(
                    "text-muted-foreground tabular-nums",
                    section.groups.length === 1 && "sr-only",
                  )}
                >
                  {group.label} · {group.items.length}
                </dt>
                <dd className="leading-relaxed">
                  {group.items.slice(0, PREVIEW_SIZE).join(", ")}
                  {group.items.length > PREVIEW_SIZE && ", …"}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-auto">
            <CopyCommandButton command={section.command} />
          </div>
        </section>
      ))}
    </div>
  );
}
