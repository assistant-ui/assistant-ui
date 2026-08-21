"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import {
  DESIGN_SECTIONS,
  type DesignComponentMeta,
} from "@/components/pages/design/registry-meta";
import { DESIGN_PREVIEWS } from "@/components/pages/design/registry";
import { typeEyebrow } from "@/components/shared/type";

export function DesignGallery(): ReactNode {
  return (
    <div className="mt-20 flex flex-col gap-20 md:mt-24">
      {DESIGN_SECTIONS.map((section, sectionIndex) => (
        <section
          key={section.label}
          className="border-foreground/10 scroll-mt-24 border-t border-dashed pt-8"
        >
          <div className="flex items-baseline gap-3">
            <span className="text-foreground/30 font-mono text-[11px] tracking-tight tabular-nums">
              {String(sectionIndex + 1).padStart(2, "0")}
            </span>
            <h2 className="text-sm font-medium">{section.label}</h2>
          </div>

          <div className="mt-6 grid grid-cols-1 items-start gap-x-6 gap-y-10 md:grid-cols-2">
            {section.components.map((component) => (
              <DesignCard key={component.slug} component={component} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function DesignCard({
  component,
}: {
  component: DesignComponentMeta;
}): ReactNode {
  const Preview = DESIGN_PREVIEWS[component.slug];

  return (
    <div className="group flex min-w-0 flex-col">
      <div className="flex h-8 items-center justify-between">
        <Link
          href={`/design/components/${component.slug}`}
          className={`${typeEyebrow} hover:text-foreground transition-colors`}
        >
          {component.name}
        </Link>
        <Link
          href={`/design/components/${component.slug}`}
          aria-label={`Open ${component.name}`}
          className="text-muted-foreground hover:text-foreground grid size-6 place-items-center rounded-(--radius-sm) opacity-0 transition-[color,opacity] group-hover:opacity-100 focus-visible:opacity-100"
        >
          <ArrowUpRightIcon className="size-3.5" />
        </Link>
      </div>
      <p className="text-muted-foreground mb-2 text-[13px] leading-relaxed">
        {component.description}
      </p>
      <div className="min-w-0 [&_.not-prose]:my-0">
        {Preview ? <Preview /> : null}
      </div>
    </div>
  );
}
