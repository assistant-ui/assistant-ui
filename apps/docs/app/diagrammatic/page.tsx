import type { Metadata } from "next";
import {
  Bullet,
  Gauge,
  ProgressRing,
  Sparkbar,
  Sparkline,
  WinLoss,
} from "diagrammatic";
import { cn } from "@/lib/utils";
import { createOgMetadata } from "@/lib/og";
import { eyebrow, gutter, meta, serif } from "@/components/diagrammatic/atlas";
import {
  CHART_COUNT,
  CHART_SECTIONS,
  SECTION_COUNT,
} from "@/components/diagrammatic/registry";
import { Plate } from "@/components/diagrammatic/plate";

const sectionId = (label: string) =>
  label.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const title = "Diagrammatic";
const description = `A field atlas of ${CHART_COUNT} chart forms: what each is called, what it is for, and when it betrays you — every specimen drawn live from the diagrammatic package.`;

export const metadata: Metadata = {
  title: { absolute: "Diagrammatic — a field atlas of chart forms" },
  description,
  ...createOgMetadata(title, description),
};

const FRIEZE = [
  <Sparkline key="sl" data={[34, 46, 40, 58, 52, 66, 60, 76, 90]} />,
  <Sparkbar key="sb" data={[3, 5, 4, 7, 6, 9, 8, 10, 7, 8]} />,
  <WinLoss key="wl" data={[1, 1, -1, 1, -1, 1, 1, -1, 1, 1]} />,
  <Bullet key="bu" value={128} target={140} bands={[60, 110, 160]} />,
  <ProgressRing key="pr" value={0.72} />,
  <Gauge key="ga" value={0.68} />,
];

export default function DiagrammaticPage() {
  return (
    <main>
      <section className={cn(gutter, "pt-20 pb-16 md:pt-28 md:pb-20")}>
        <h1
          className={cn(
            serif,
            "max-w-[17ch] text-[clamp(3rem,8.5vw,7rem)] leading-[0.98] tracking-[-0.01em] text-balance",
          )}
        >
          Seventy-four ways to <em className="text-(--da-red)">draw</em> a
          number.
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

      <section
        aria-hidden="true"
        className="grid grid-cols-3 border-t border-(--da-line) sm:grid-cols-6 [&_[data-part=legend]]:hidden [&_text]:hidden"
      >
        {FRIEZE.map((chart, i) => (
          <div
            key={i}
            className="flex h-20 items-center justify-center border-r border-b border-(--da-line) bg-(--da-plate) px-6 py-4"
          >
            <div className="w-full max-w-28">{chart}</div>
          </div>
        ))}
      </section>

      <nav
        aria-label="Families"
        className={cn(
          gutter,
          "sticky top-13 z-30 overflow-x-auto border-b border-(--da-line) bg-(--da-paper) whitespace-nowrap",
        )}
      >
        <div className="flex items-center gap-6 py-3">
          {CHART_SECTIONS.map((section, i) => (
            <a
              key={section.label}
              href={`#${sectionId(section.label)}`}
              className={cn(meta, "group text-(--da-ink)/60 transition-colors")}
            >
              <span className="text-(--da-ink)/30 tabular-nums transition-colors group-hover:text-(--da-red)">
                {String(i + 1).padStart(2, "0")}
              </span>{" "}
              <span className="group-hover:text-(--da-ink)">
                {section.label}
              </span>{" "}
              <span className="text-(--da-ink)/30 tabular-nums">
                {section.charts.length}
              </span>
            </a>
          ))}
        </div>
      </nav>

      {CHART_SECTIONS.map((section, sectionIndex) => (
        <section
          key={section.label}
          id={sectionId(section.label)}
          className="scroll-mt-24"
        >
          <div
            className={cn(
              gutter,
              "flex flex-wrap items-end justify-between gap-x-12 gap-y-4 pt-16 pb-10 md:pt-20",
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
