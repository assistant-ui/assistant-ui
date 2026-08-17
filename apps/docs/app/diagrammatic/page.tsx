import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { createOgMetadata } from "@/lib/og";
import { eyebrow, gutter, meta, serif } from "@/components/diagrammatic/atlas";
import { FamilyToc } from "@/components/diagrammatic/family-toc";
import {
  CHART_COUNT,
  CHART_SECTIONS,
  SECTION_COUNT,
  sectionId,
} from "@/components/diagrammatic/registry";
import { Plate } from "@/components/diagrammatic/plate";

const title = "Diagrammatic";
const description = `A field atlas of ${CHART_COUNT} chart forms: what each is called, what it is for, and when it betrays you — every specimen drawn live from the diagrammatic package.`;

export const metadata: Metadata = {
  title: { absolute: "Diagrammatic — a field atlas of chart forms" },
  description,
  ...createOgMetadata(title, description),
};

export default function DiagrammaticPage() {
  return (
    <main>
      <section className={cn(gutter, "pt-16 pb-12 md:pt-24 md:pb-16")}>
        <h1
          className={cn(
            serif,
            "max-w-[17ch] text-[clamp(3rem,8.5vw,7rem)] leading-[0.98] tracking-[-0.01em] text-balance",
          )}
        >
          Sixty-six ways to <em className="text-(--da-red)">draw</em> a number.
        </h1>
        <div className="mt-10 flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
          <p className="max-w-md text-[15px] leading-relaxed text-(--da-ink)/60">
            A field atlas of chart forms: every specimen named, drawn live from
            the diagrammatic package, and filed with what it is for and when it
            betrays you.
          </p>
          <p className={cn(eyebrow, "text-(--da-ink)/40 tabular-nums")}>
            {CHART_COUNT} forms · {SECTION_COUNT} families · React · zero
            dependencies
          </p>
        </div>
      </section>

      <FamilyToc
        sections={CHART_SECTIONS.map((section) => ({
          id: sectionId(section.label),
          label: section.label,
        }))}
      />

      {CHART_SECTIONS.map((section, sectionIndex) => (
        <section
          key={section.label}
          id={sectionId(section.label)}
          className="scroll-mt-24"
        >
          <div
            className={cn(
              gutter,
              "flex flex-wrap items-end justify-between gap-x-12 gap-y-4 pt-12 pb-8 md:pt-16 md:pb-10",
            )}
          >
            <div>
              <p className={cn(eyebrow, "text-(--da-red) tabular-nums")}>
                family {String(sectionIndex + 1).padStart(2, "0")}
              </p>
              <h2
                className={cn(
                  serif,
                  "mt-3 text-4xl tracking-[-0.005em] md:text-5xl",
                )}
              >
                {section.label}
              </h2>
              <p className="mt-4 max-w-lg text-[13.5px] leading-relaxed text-(--da-ink)/55">
                {section.intro}
              </p>
            </div>
            <p className={cn(meta, "text-(--da-ink)/40 tabular-nums")}>
              {section.charts.length} forms
            </p>
          </div>
          <div className="grid grid-cols-2 border-t border-(--da-line) lg:grid-cols-3 xl:grid-cols-4">
            {section.charts.map((chart, index) => (
              <Plate key={chart.slug} chart={chart} delay={(index % 4) * 50} />
            ))}
          </div>
        </section>
      ))}

      <section className={cn(gutter, "py-24 md:py-32")}>
        <p
          className={cn(
            serif,
            "max-w-2xl text-2xl leading-snug text-(--da-ink)/75 italic md:text-3xl",
          )}
        >
          Pick the job first, then the form: the same numbers can be a trend, a
          ranking, or a share. When two forms both fit, take the plainer one.
        </p>
      </section>
    </main>
  );
}
