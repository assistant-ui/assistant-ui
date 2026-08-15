import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { createOgMetadata } from "@/lib/og";
import { ScrollReset } from "@/components/elements/scroll-reset";
import {
  eyebrow,
  gutter,
  meta,
  mono,
  serif,
} from "@/components/diagrammatic/atlas";
import {
  CHART_COUNT,
  CHART_SECTIONS,
  CHARTS,
  getChart,
  sectionId,
} from "@/components/diagrammatic/registry";
import { FrameworkToggle } from "@/components/diagrammatic/framework-toggle";

export function generateStaticParams() {
  return CHARTS.map((chart) => ({ slug: chart.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const chart = getChart(slug);
  if (!chart) return {};
  return {
    title: chart.name,
    description: `${chart.blurb} ${chart.use}`,
    ...createOgMetadata(chart.name, chart.use),
  };
}

export default async function ChartPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chart = getChart(slug);
  if (!chart) notFound();

  const previous = CHARTS[chart.index - 2];
  const next = CHARTS[chart.index];
  const family = CHART_SECTIONS[chart.sectionIndex]!;
  const [hero, ...rest] = chart.examples;

  return (
    <main>
      <ScrollReset />

      <div
        className={cn(
          gutter,
          "flex h-12 items-center gap-5 border-b border-(--da-line)",
        )}
      >
        <Link
          href="/diagrammatic"
          className={cn(
            meta,
            "shrink-0 text-(--da-ink)/55 transition-colors hover:text-(--da-red)",
          )}
        >
          ← All forms
        </Link>
        <span aria-hidden className="h-4 w-px shrink-0 bg-(--da-line)" />
        <span className="flex min-w-0 items-baseline gap-2.5">
          <Link
            href={`/diagrammatic#${sectionId(chart.section)}`}
            className={cn(
              meta,
              "truncate text-(--da-ink)/70 transition-colors hover:text-(--da-red)",
            )}
          >
            {chart.section}
          </Link>
          <span
            className={cn(
              meta,
              "shrink-0 text-[12px] text-(--da-ink)/35 tabular-nums",
            )}
          >
            plate {chart.index} of {CHART_COUNT}
          </span>
        </span>
        <div className="ms-auto">
          <FrameworkToggle />
        </div>
      </div>

      <header
        className={cn(
          gutter,
          "grid gap-x-16 gap-y-10 py-14 md:py-18 lg:grid-cols-[minmax(0,1fr)_20rem]",
        )}
      >
        <div>
          <h1
            className={cn(
              serif,
              "text-[clamp(2.75rem,6vw,4.5rem)] leading-[1.02] tracking-[-0.01em]",
            )}
          >
            {chart.name}
          </h1>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-(--da-ink)/60 md:text-lg">
            {chart.blurb}
          </p>
          <p
            className={cn(
              mono,
              "mt-8 inline-block border border-(--da-line) px-3.5 py-2 text-(--da-ink)/55",
            )}
          >
            import {"{"}{" "}
            <span className="text-(--da-red)">{chart.exportName}</span> {"}"}{" "}
            from &quot;diagrammatic&quot;
          </p>
        </div>
        <aside className="flex flex-col gap-8 lg:pt-3">
          <div>
            <h2 className={cn(eyebrow, "text-(--da-red)")}>use it for</h2>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-(--da-ink)/60">
              {chart.use}
            </p>
          </div>
          <div>
            <h2 className={cn(eyebrow, "text-(--da-ink)/40")}>watch out</h2>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-(--da-ink)/60">
              {chart.watch}
            </p>
          </div>
        </aside>
      </header>

      {hero ? (
        <figure className="border-y border-(--da-line) bg-(--da-plate)">
          <div className={cn(gutter, "pt-10 md:pt-12")}>
            <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className={cn(eyebrow, "text-(--da-red)")}>fig. 1</span>
              <span className="text-[15px] font-medium tracking-tight">
                {hero.title}
              </span>
            </p>
            <p className="mt-2.5 max-w-2xl text-[13.5px] leading-relaxed text-(--da-ink)/60">
              {hero.setup}
            </p>
          </div>
          <div className={cn(gutter, "py-10 md:py-12")}>
            <div className="mx-auto w-full max-w-[54rem]">{hero.chart}</div>
          </div>
          <figcaption
            className={cn(
              gutter,
              "flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-dashed border-(--da-line) py-4",
            )}
          >
            <span className={cn(eyebrow, "shrink-0 text-(--da-ink)/40")}>
              the read
            </span>
            <span className="max-w-3xl text-[13px] leading-relaxed text-(--da-ink)/60">
              {hero.read}
            </span>
          </figcaption>
        </figure>
      ) : null}

      {rest.length > 0 ? (
        <div className="grid md:grid-cols-2">
          {rest.map((example, i) => (
            <figure
              key={example.title}
              className={cn(
                "flex flex-col border-r border-b border-(--da-line) bg-(--da-plate) px-5 py-9 sm:px-8 lg:px-12",
                rest.length % 2 === 1 &&
                  i === rest.length - 1 &&
                  "md:col-span-2",
              )}
            >
              <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className={cn(eyebrow, "text-(--da-red)")}>
                  fig. {i + 2}
                </span>
                <span className="text-[14px] font-medium tracking-tight">
                  {example.title}
                </span>
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-(--da-ink)/55">
                {example.setup}
              </p>
              <div className="my-auto flex w-full justify-center py-8">
                <div className="w-full max-w-[30rem]">{example.chart}</div>
              </div>
              <figcaption className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-dashed border-(--da-line) pt-3.5">
                <span className={cn(eyebrow, "shrink-0 text-(--da-ink)/40")}>
                  the read
                </span>
                <span className="text-[13px] leading-relaxed text-(--da-ink)/60">
                  {example.read}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      <section className={cn(gutter, "py-10")}>
        <p className={cn(eyebrow, "text-(--da-ink)/40")}>
          {family.label} · {family.charts.length} forms
        </p>
        <p className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          {family.charts.map((sibling) =>
            sibling.slug === chart.slug ? (
              <span
                key={sibling.slug}
                className="text-[13.5px] font-medium text-(--da-red)"
              >
                <span className="tabular-nums">
                  {String(sibling.index).padStart(2, "0")}
                </span>{" "}
                {sibling.name}
              </span>
            ) : (
              <Link
                key={sibling.slug}
                href={`/diagrammatic/${sibling.slug}`}
                scroll={false}
                className="text-[13.5px] text-(--da-ink)/55 transition-colors hover:text-(--da-ink)"
              >
                <span className="text-(--da-ink)/35 tabular-nums">
                  {String(sibling.index).padStart(2, "0")}
                </span>{" "}
                {sibling.name}
              </Link>
            ),
          )}
        </p>
      </section>

      <nav className="grid grid-cols-2 border-t border-(--da-line) [&>*]:border-r [&>*]:border-(--da-line)">
        {previous ? (
          <Link
            href={`/diagrammatic/${previous.slug}`}
            scroll={false}
            className={cn(
              gutter,
              "group bg-(--da-paper) py-8 transition-colors hover:bg-(--da-plate)",
            )}
          >
            <p className={cn(eyebrow, "text-(--da-ink)/40 tabular-nums")}>
              ← plate {String(previous.index).padStart(2, "0")}
            </p>
            <p
              className={cn(
                serif,
                "mt-2 text-2xl transition-colors group-hover:text-(--da-red)",
              )}
            >
              {previous.name}
            </p>
          </Link>
        ) : (
          <span className="bg-(--da-paper)" />
        )}
        {next ? (
          <Link
            href={`/diagrammatic/${next.slug}`}
            scroll={false}
            className={cn(
              gutter,
              "group bg-(--da-paper) py-8 text-right transition-colors hover:bg-(--da-plate)",
            )}
          >
            <p className={cn(eyebrow, "text-(--da-ink)/40 tabular-nums")}>
              plate {String(next.index).padStart(2, "0")} →
            </p>
            <p
              className={cn(
                serif,
                "mt-2 text-2xl transition-colors group-hover:text-(--da-red)",
              )}
            >
              {next.name}
            </p>
          </Link>
        ) : (
          <span className="bg-(--da-paper)" />
        )}
      </nav>
    </main>
  );
}
