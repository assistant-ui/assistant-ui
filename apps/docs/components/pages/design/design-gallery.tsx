"use client";

import type { ReactNode } from "react";
import { DESIGN_SECTIONS } from "@/components/pages/design/registry-meta";
import { DESIGN_PREVIEWS } from "@/components/pages/design/registry";
import { DemoCard } from "@/components/pages/elements/demo-card";

const specimenClassName =
  "flex h-full w-full min-w-0 overflow-auto [&_.not-prose]:my-0 [&>.not-prose]:m-auto! [&>.not-prose]:w-full [&>.not-prose>div]:border-0 [&>.not-prose>div]:p-0";

export function DesignGallery(): ReactNode {
  let runningIndex = 0;

  return (
    <div className="mt-20 flex flex-col gap-20">
      {DESIGN_SECTIONS.map((section, sectionIndex) => (
        <section
          key={section.label}
          className="border-foreground/10 scroll-mt-24 border-t pt-6"
        >
          <div className="flex items-baseline gap-3">
            <span className="text-muted-foreground text-xs tabular-nums">
              {String(sectionIndex + 1).padStart(2, "0")}
            </span>
            <h2 className="text-sm font-medium">{section.label}</h2>
            <span className="text-muted-foreground ms-auto text-sm tabular-nums">
              {section.components.length} components
            </span>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
            {section.components.map((component) => {
              runningIndex += 1;
              const Preview = DESIGN_PREVIEWS[component.slug];
              return (
                <DemoCard
                  key={component.slug}
                  href={`/design/components/${component.slug}`}
                  index={runningIndex}
                  title={component.name}
                  description={component.description}
                >
                  <div className={specimenClassName}>
                    {Preview ? <Preview /> : null}
                  </div>
                </DemoCard>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
