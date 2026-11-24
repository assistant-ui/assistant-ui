import Link from "next/link";

export type BlockElementLink = {
  slug: string;
  title: string;
  description: string;
  section: string;
  kind: "element" | "primitive";
  names: readonly string[];
};

export function BlockElements({
  elements,
}: {
  elements: readonly BlockElementLink[];
}) {
  const seen = new Set<string>();
  const unique = elements.filter((element) => {
    if (seen.has(element.slug)) return false;
    seen.add(element.slug);
    return true;
  });

  return (
    <nav aria-label="Elements in this block">
      <ul className="flex flex-wrap items-center gap-1.5">
        {unique.map((element) => (
          <li key={element.slug}>
            <Link
              href={`/elements/${element.slug}`}
              title={element.description}
              className="border-foreground/10 text-muted-foreground hover:text-foreground hover:border-foreground/20 inline-flex h-6 items-center rounded-full border px-2.5 text-[12px] transition-colors"
            >
              {element.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
