import type { Metadata } from "next";
import {
  Area,
  Bullet,
  Gauge,
  Line,
  ProgressRing,
  Sparkbar,
  Sparkline,
  WinLoss,
} from "diagrammatic";
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

const FRIEZE = [
  <Sparkline key="sl1" data={[34, 46, 40, 58, 52, 66, 60, 76, 90]} />,
  <Sparkbar key="sb1" data={[3, 5, 4, 7, 6, 9, 8, 10, 7, 8]} />,
  <WinLoss key="wl1" data={[1, 1, -1, 1, -1, 1, 1, -1, 1, 1]} />,
  <Bullet key="bu1" value={128} target={140} bands={[60, 110, 160]} />,
  <Line key="ln" data={[12, 18, 15, 24, 21, 30, 27, 34]} />,
  <ProgressRing key="pr1" value={0.72} />,
  <Sparkline key="sl2" data={[88, 80, 74, 70, 64, 60, 52, 48]} />,
  <Gauge key="ga1" value={0.68} />,
  <Area key="ar" data={[4, 7, 6, 10, 9, 13, 11, 15]} />,
  <WinLoss key="wl2" data={[-1, 1, 1, 1, -1, 1, -1, 1, 1, 1]} />,
  <Sparkbar key="sb2" data={[9, 7, 8, 6, 5, 6, 4, 5, 3, 4]} />,
  <Line key="st" step data={[19, 19, 29, 25, 39, 35, 49]} />,
  <ProgressRing key="pr2" value={0.35} />,
  <Bullet key="bu2" value={72} target={60} bands={[30, 55, 90]} />,
];

function FriezeRow({ hidden }: { hidden?: boolean }) {
  return (
    <div aria-hidden={hidden} className="flex shrink-0 items-stretch">
      {FRIEZE.map((chart, i) => (
        <div
          key={i}
          className="flex h-16 w-48 shrink-0 items-center justify-center border-r border-(--da-line) px-7"
        >
          <div className="w-full max-w-24">{chart}</div>
        </div>
      ))}
    </div>
  );
}

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

      <section
        aria-hidden="true"
        className="overflow-hidden border-t border-(--da-line) bg-(--da-plate) [&_[data-part=legend]]:hidden [&_text]:hidden"
      >
        <style>{`@keyframes atlas-marquee { to { transform: translateX(-50%); } }`}</style>
        <div className="flex w-max [animation:atlas-marquee_56s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:[animation:none]">
          <FriezeRow />
          <FriezeRow hidden />
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
