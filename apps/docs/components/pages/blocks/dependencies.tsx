import { PackageIcon } from "@/components/pages/blocks/package-icon";
import type { BlockDependency } from "@/components/pages/blocks/block-source";

export function Dependencies({
  dependencies,
}: {
  dependencies: readonly BlockDependency[];
}) {
  return (
    <section
      id="dependencies"
      aria-labelledby="dependencies-label"
      className="border-foreground/10 scroll-mt-24 border-t py-10 md:py-12"
    >
      <h2 id="dependencies-label" className="text-sm font-medium">
        Dependencies
      </h2>
      <ul className="border-foreground/10 mt-6 gap-x-10 rounded-2xl border px-5 py-3 sm:columns-2 lg:columns-3">
        {dependencies.map((dependency) => (
          <li
            key={dependency.name}
            className="hover:bg-foreground/[0.025] -mx-2 flex break-inside-avoid items-baseline gap-2.5 px-2 py-2 font-mono text-[13px] transition-colors [font-variant-ligatures:none] motion-reduce:transition-none"
          >
            <PackageIcon
              name={dependency.name}
              className="size-3.5 shrink-0 self-center"
            />
            <span className="min-w-0 flex-1 truncate">{dependency.name}</span>
            <span className="text-muted-foreground shrink-0 text-xs">
              {dependency.range}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
