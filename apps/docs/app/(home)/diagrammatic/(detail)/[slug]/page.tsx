import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mono } from "@/components/elements/surfaces";
import { CopyButton } from "@/components/elements/copy-button";
import { createOgMetadata } from "@/lib/og";
import { highlightElementSource } from "@/lib/element-source";
import {
  CHART_COUNT,
  CHARTS,
  getChart,
} from "@/components/diagrammatic/registry";
import { ChartCanvas } from "@/components/diagrammatic/chart-canvas";
import { readChartSource } from "@/components/diagrammatic/source";

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
  const title = `${chart.name} | Diagrammatic`;
  return {
    title,
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

  const source = await readChartSource(chart.slug);
  const highlightedSource = await highlightElementSource(source);

  const previous = CHARTS[chart.index - 2];
  const next = CHARTS[chart.index];

  return (
    <>
      <header className="mt-8 lg:mt-0">
        <p className={cn(mono, "text-foreground/35 tabular-nums")}>
          {String(chart.index).padStart(2, "0")} /{" "}
          {String(CHART_COUNT).padStart(2, "0")} · {chart.section}
        </p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight md:text-4xl">
          {chart.name}
        </h1>
        <p className="text-foreground/55 mt-3 max-w-lg text-[15px] leading-relaxed">
          {chart.blurb}
        </p>
      </header>

      <div className="mt-8">
        <ChartCanvas
          className="h-[20rem] p-8 md:h-[24rem] md:p-12"
          chartClassName="max-w-[30rem]"
        >
          <chart.Component />
        </ChartCanvas>
        <div className="mt-3 flex items-baseline justify-between gap-4">
          <p className={cn(mono, "text-foreground/40")}>{chart.scenario}</p>
          <p className={cn(mono, "text-foreground/25")}>{chart.slug}</p>
        </div>
      </div>

      <section className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className={cn(mono, "text-blue-500 dark:text-blue-400")}>
            use it for
          </h2>
          <p className="text-foreground/60 mt-2 text-[13.5px] leading-relaxed">
            {chart.use}
          </p>
        </div>
        <div>
          <h2 className={cn(mono, "text-foreground/40")}>watch out</h2>
          <p className="text-foreground/60 mt-2 text-[13.5px] leading-relaxed">
            {chart.watch}
          </p>
        </div>
      </section>

      <section className="mt-12">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-medium">Source</h2>
          <span className={cn(mono, "text-foreground/35")}>
            charts/{chart.slug}.tsx
          </span>
          <CopyButton text={source} className="ms-auto" />
        </div>
        <div
          className="bg-foreground/[0.025] dark:bg-foreground/[0.04] mt-4 overflow-hidden rounded-2xl [&_.line]:px-0! [&_pre]:overflow-x-auto [&_pre]:bg-transparent! [&_pre]:p-5 [&_pre]:font-mono [&_pre]:text-[12.5px] [&_pre]:leading-[1.7] md:[&_pre]:p-6"
          dangerouslySetInnerHTML={{ __html: highlightedSource }}
        />
        <p className="text-foreground/40 mt-3 text-[13px] leading-relaxed">
          A self-contained server component: plain SVG, theme tokens, no chart
          library. Copy it and feed it your data.
        </p>
      </section>

      <nav className="border-foreground/10 mt-16 flex items-center justify-between gap-4 border-t border-dashed pt-6">
        {previous ? (
          <Link
            href={`/diagrammatic/${previous.slug}`}
            scroll={false}
            className="group text-foreground/45 hover:text-foreground/90 flex items-center gap-2 text-[13px] transition-colors"
          >
            <ArrowLeftIcon className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span className={cn(mono, "text-foreground/30 tabular-nums")}>
              {String(previous.index).padStart(2, "0")}
            </span>
            {previous.name}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/diagrammatic/${next.slug}`}
            scroll={false}
            className="group text-foreground/45 hover:text-foreground/90 flex items-center gap-2 text-[13px] transition-colors"
          >
            <span className={cn(mono, "text-foreground/30 tabular-nums")}>
              {String(next.index).padStart(2, "0")}
            </span>
            {next.name}
            <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}
