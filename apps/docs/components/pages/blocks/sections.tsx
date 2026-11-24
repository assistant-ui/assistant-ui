import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function BlockSection({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-label`}
      className="border-foreground/10 scroll-mt-24 border-t py-10 md:py-12"
    >
      <h2 id={`${id}-label`} className="text-sm font-medium">
        {label}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export type BlockElementLink = {
  slug: string;
  title: string;
  description: string;
  section: string;
  kind: "element" | "primitive";
  names: readonly string[];
};

function ElementList({ elements }: { elements: readonly BlockElementLink[] }) {
  const groups: { label: string; elements: BlockElementLink[] }[] = [];
  for (const element of elements) {
    const group = groups.at(-1);
    if (group?.label === element.section) group.elements.push(element);
    else groups.push({ label: element.section, elements: [element] });
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <div key={group.label}>
          <h3 className="text-muted-foreground text-[13px]">{group.label}</h3>
          <ul className="mt-1">
            {group.elements.map((element) => (
              <li key={element.slug}>
                <Link
                  href={`/elements/${element.slug}`}
                  className="hover:bg-foreground/[0.025] group -mx-3 grid items-start gap-x-6 px-3 py-2.5 transition-colors md:grid-cols-[16rem_minmax(0,1fr)]"
                >
                  <span className="min-w-0">
                    <span className="text-sm font-medium">
                      {element.title}
                      <ArrowUpRight className="ms-1.5 mb-0.5 inline size-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
                    </span>
                    <span className="text-muted-foreground mt-1 block font-mono text-[12px] [font-variant-ligatures:none]">
                      {element.names.join(", ")}
                    </span>
                  </span>
                  <span className="text-muted-foreground text-[13px] leading-relaxed">
                    {element.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function BlockElements({
  elements,
}: {
  elements: readonly BlockElementLink[];
}) {
  const imported = elements.filter((element) => element.kind === "element");
  const primitives = elements.filter((element) => element.kind === "primitive");

  return (
    <>
      {imported.length > 0 && (
        <BlockSection id="elements" label="Uses the element">
          <ElementList elements={imported} />
        </BlockSection>
      )}
      {primitives.length > 0 && (
        <BlockSection id="primitives" label="Uses the primitive">
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            This block renders the primitive. The link opens the element built
            on it.
          </p>
          <div className="mt-6">
            <ElementList elements={primitives} />
          </div>
        </BlockSection>
      )}
    </>
  );
}
