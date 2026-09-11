import Link from "next/link";
import { typeEyebrow } from "@/components/shared/type";
import { cn } from "@/lib/utils";

export function SectionIndex({
  sections,
}: {
  sections: { id: string; label: string; count: number }[];
}) {
  return (
    <nav
      aria-label="Sections"
      className="border-foreground/10 mt-16 border-t pt-6"
    >
      <p className={typeEyebrow}>Contents</p>
      <ul className="mt-3 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sections.map((section, index) => (
          <li key={section.id}>
            <Link
              href={`#${section.id}`}
              className="hover:bg-foreground/[0.025] -mx-2 flex items-baseline gap-2.5 px-2 py-1.5 transition-colors"
            >
              <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-[13.5px]">{section.label}</span>
              <span className="text-muted-foreground ms-auto font-mono text-[11px] tabular-nums">
                {section.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SectionHeader({
  index,
  label,
  count,
}: {
  index: number;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-muted-foreground font-mono text-[11px] tabular-nums">
        {String(index).padStart(2, "0")}
      </span>
      <h2 className={cn(typeEyebrow, "text-foreground")}>{label}</h2>
      <span className="text-muted-foreground ms-auto font-mono text-[11px] tabular-nums">
        {count} elements
      </span>
    </div>
  );
}
