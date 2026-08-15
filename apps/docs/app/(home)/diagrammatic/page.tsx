import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mono } from "@/components/elements/surfaces";
import { SectionRail } from "@/components/elements/section-rail";
import { createOgMetadata } from "@/lib/og";
import {
  CHART_COUNT,
  CHART_SECTIONS,
  SECTION_COUNT,
} from "@/components/diagrammatic/registry";
import { ChartCard } from "@/components/diagrammatic/chart-card";

const sectionId = (label: string) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const title = "Diagrammatic";
const description = `${CHART_COUNT} chart forms in one place: what each is called, what it is for, and when it betrays you. From line to sankey to hexbin, every specimen is drawn live in the house style.`;

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default function DiagrammaticPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-24 pb-32 md:pt-32">
      <SectionRail
        sections={CHART_SECTIONS.map((section) => ({
          id: sectionId(section.label),
          label: section.label,
        }))}
      />
      <header className="max-w-2xl">
        <p className={cn(mono, "text-foreground/35")}>Diagrammatic</p>
        <h1 className="mt-4 text-4xl font-medium tracking-tight text-balance md:text-5xl">
          Every chart you can reach for.
        </h1>
        <p className="text-foreground/55 mt-5 max-w-xl text-[15px] leading-relaxed md:text-base">
          {CHART_COUNT} chart forms across {SECTION_COUNT} jobs the data can do:
          time, comparison, composition, distribution, correlation, deviation,
          flow, structure, space, and the tiny charts that live inside
          sentences. Each one drawn live, named, and filed with what it is for
          and when it betrays you.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2">
          {CHART_SECTIONS.map((section) => (
            <a
              key={section.label}
              href={`#${sectionId(section.label)}`}
              className={cn(
                mono,
                "text-foreground/40 hover:text-foreground/90 transition-colors",
              )}
            >
              {section.label}
              <span className="text-foreground/25">
                {" "}
                {section.charts.length}
              </span>
            </a>
          ))}
        </div>
      </header>

      <div className="mt-20 flex flex-col gap-20 md:mt-24">
        {CHART_SECTIONS.map((section, sectionIndex) => (
          <section
            key={section.label}
            id={sectionId(section.label)}
            className="border-foreground/10 scroll-mt-24 border-t border-dashed pt-8"
          >
            <div className="flex items-baseline gap-3">
              <span className={cn(mono, "text-foreground/30 tabular-nums")}>
                {String(sectionIndex + 1).padStart(2, "0")}
              </span>
              <h2 className="text-sm font-medium">{section.label}</h2>
              <span
                className={cn(mono, "text-foreground/35 ms-auto tabular-nums")}
              >
                {section.charts.length} charts
              </span>
            </div>
            <p className="text-foreground/50 mt-3 max-w-lg text-[13.5px] leading-relaxed">
              {section.intro}
            </p>
            <div className="mt-8 grid gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {section.charts.map((chart, index) => (
                <ChartCard
                  key={chart.slug}
                  chart={chart}
                  delay={(index % 3) * 60}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="border-foreground/10 mt-24 border-t border-dashed pt-8">
        <p className="text-foreground/50 max-w-xl text-[13.5px] leading-relaxed">
          Pick the job first, then the form: the same numbers can be a trend, a
          ranking, or a share depending on the question. When two forms both
          fit, take the plainer one.
        </p>
        <p className="mt-4 text-[13px]">
          <Link
            href="/elements"
            className="text-foreground/45 hover:text-foreground/90 group inline-flex items-center gap-1.5 transition-colors"
          >
            Interface pieces for AI products live in Elements
            <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </p>
      </footer>
    </main>
  );
}
