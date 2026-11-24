import type { BlockDependency } from "@/components/pages/blocks/block-source";
import { PackageIcon } from "@/components/pages/blocks/package-icon";
import { BlockSection } from "@/components/pages/blocks/sections";

export function Dependencies({
  dependencies,
}: {
  dependencies: readonly BlockDependency[];
}) {
  return (
    <BlockSection id="dependencies" label="Dependencies">
      <ul className="border-foreground/10 gap-x-10 border-t font-mono text-[13px] [font-variant-ligatures:none] sm:columns-2 lg:columns-3">
        {dependencies.map((dependency) => (
          <li
            key={dependency.name}
            className="border-foreground/10 flex break-inside-avoid items-baseline gap-2.5 border-b py-3"
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
    </BlockSection>
  );
}
