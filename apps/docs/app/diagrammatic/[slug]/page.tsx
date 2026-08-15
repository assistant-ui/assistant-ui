import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { createOgMetadata } from "@/lib/og";
import { ScrollReset } from "@/components/elements/scroll-reset";
import { anno, gutter, serif } from "@/components/diagrammatic/atlas";
import {
  CHART_COUNT,
  CHART_SECTIONS,
  CHARTS,
  getChart,
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
            anno,
            "text-(--da-ink)/50 transition-colors hover:text-(--da-red)",
          )}
        >
          ← index
        </Link>
        <span className={cn(anno, "truncate text-(--da-ink)/35 tabular-nums")}>
          {chart.section} · plate {String(chart.index).padStart(2, "0")} /{" "}
          {CHART_COUNT}
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
              anno,
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
            <h2 className={cn(anno, "text-(--da-red) uppercase")}>
              use it for
            </h2>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-(--da-ink)/60">
              {chart.use}
            </p>
          </div>
          <div>
            <h2 className={cn(anno, "text-(--da-ink)/40 uppercase")}>
              watch out
            </h2>
            <p className="mt-2.5 text-[13.5px] leading-relaxed text-(--da-ink)/60">
              {chart.watch}
            </p>
          </div>
        </aside>
      </header>

      {hero ? (
        <figure className="border-y border-(--da-line) bg-(--da-plate)">
          <div className={cn(gutter, "py-12 md:py-16")}>
            <div className="mx-auto w-full max-w-[54rem]">{hero.chart}</div>
          </div>
          <figcaption
            className={cn(
              gutter,
              "flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-dashed border-(--da-line) py-4",
            )}
          >
            <span className={cn(anno, "text-(--da-red)")}>fig. 1</span>
            <span className="text-[13.5px] font-medium">{hero.title}</span>
            <span className="text-[13px] leading-relaxed text-(--da-ink)/50">
              {hero.note}
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
                "flex flex-col border-r border-b border-(--da-line) bg-(--da-plate) px-5 py-10 sm:px-8 lg:px-12",
                rest.length % 2 === 1 &&
                  i === rest.length - 1 &&
                  "md:col-span-2",
              )}
            >
              <div className="my-auto flex w-full justify-center py-2">
                <div className="w-full max-w-[30rem]">{example.chart}</div>
              </div>
              <figcaption className="mt-8">
                <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className={cn(anno, "text-(--da-red)")}>
                    fig. {i + 2}
                  </span>
                  <span className="text-[13.5px] font-medium">
                    {example.title}
                  </span>
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-(--da-ink)/50">
                  {example.note}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : null}

      <section className={cn(gutter, "py-10")}>
        <p className={cn(anno, "text-(--da-ink)/35 uppercase")}>
          {family.label} · {family.charts.length} forms
        </p>
        <p className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          {family.charts.map((sibling) =>
            sibling.slug === chart.slug ? (
              <span
                key={sibling.slug}
                className="text-[13.5px] font-medium text-(--da-red)"
              >
                <span className={cn(anno, "tabular-nums")}>
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
                <span className={cn(anno, "text-(--da-ink)/30 tabular-nums")}>
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
            <p className={cn(anno, "text-(--da-ink)/40 tabular-nums")}>
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
            <p className={cn(anno, "text-(--da-ink)/40 tabular-nums")}>
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
