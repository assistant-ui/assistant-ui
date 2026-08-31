import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  OSS_CATEGORIES,
  OSS_PROJECTS,
  fetchOssStats,
  ossNpmUrl,
  ossPrimaryUrl,
  ossRepoUrl,
  type OssCategory,
  type OssProject,
  type OssStats,
} from "@/lib/oss";
import { formatCompact } from "@/lib/format";
import { createOgMetadata } from "@/lib/og";
import { PageFrame } from "@/components/shared/page-frame";
import {
  typeDeck,
  typeEyebrow,
  typePage,
  typeSection,
} from "@/components/shared/type";
import { cn } from "@/lib/utils";

const title = "Open source";
const description =
  "Every open source project from the assistant-ui organization, with links to its docs, source, and packages.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

export default async function OssPage() {
  const stats = await fetchOssStats();

  const flagship = OSS_PROJECTS.find((project) => project.category === "sdk");
  const rest = OSS_PROJECTS.filter((project) => project !== flagship);
  const grouped = groupByCategory(rest);
  const visibleCategories = (
    Object.keys(OSS_CATEGORIES) as OssCategory[]
  ).filter((category) => (grouped[category]?.length ?? 0) > 0);

  const stars = flagship ? stats.stars[flagship.repo] : undefined;
  const weekly = flagship?.npm ? stats.weekly[flagship.npm] : undefined;

  return (
    <PageFrame pad="sub">
      <header className="max-w-2xl">
        <h1 className={typePage}>Built in the open.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          {OSS_PROJECTS.length} projects across the assistant-ui organization,
          from the chat runtime to the primitives we extracted along the way.
        </p>
      </header>

      {flagship ? (
        <div className="border-foreground/10 mt-16 border-t md:mt-20">
          <section className="border-foreground/10 border-b py-10 md:py-14">
            <p className={typeEyebrow}>
              {OSS_CATEGORIES[flagship.category].label}
            </p>
            <div className="mt-5 flex flex-col gap-8 lg:flex-row lg:items-baseline lg:justify-between lg:gap-16">
              <div className="min-w-0">
                <Link href={ossPrimaryUrl(flagship)} className="group block">
                  <h2 className={typeSection}>
                    {flagship.name}
                    <ArrowUpRight className="ms-1.5 mb-0.5 inline size-4 opacity-0 transition-opacity group-hover:opacity-50" />
                  </h2>
                </Link>
                <p className="text-muted-foreground mt-3 max-w-[52ch] text-[15px] leading-relaxed">
                  {flagship.description}
                </p>
                <p className="mt-6 flex flex-wrap items-baseline gap-x-7 gap-y-2 font-mono text-[13px]">
                  <Link
                    href="/docs"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    docs
                  </Link>
                  <a
                    href={ossRepoUrl(flagship)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    github
                  </a>
                  {flagship.npm ? (
                    <a
                      href={ossNpmUrl(flagship.npm)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      npm
                    </a>
                  ) : null}
                </p>
              </div>
              {stars || weekly ? (
                <div className="flex shrink-0 gap-10 lg:gap-14">
                  {stars ? <Figure value={stars} label="GitHub stars" /> : null}
                  {weekly ? (
                    <Figure value={weekly} label="npm installs / week" />
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>

          {visibleCategories.map((category) => (
            <section
              key={category}
              className="border-foreground/10 border-b py-10 md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-12 md:py-12"
            >
              <div className="mb-6 md:mb-0">
                <h2 className={typeEyebrow}>
                  {OSS_CATEGORIES[category].label}
                </h2>
                <p className="text-muted-foreground/70 mt-2 max-w-[22ch] text-[13px] leading-relaxed">
                  {OSS_CATEGORIES[category].description}
                </p>
              </div>
              <ul className="-my-2.5 flex flex-col">
                {grouped[category]!.map((project) => (
                  <li key={project.id}>
                    <ProjectRow project={project} stats={stats} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : null}

      <footer className="mt-24">
        <Link
          href="/packages"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          Every package we publish on npm
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </footer>
    </PageFrame>
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-display text-4xl font-[550] tracking-[-0.01em] tabular-nums">
        {formatCompact(value)}
      </p>
      <p className="text-muted-foreground mt-1.5 font-mono text-[11px] tracking-wide">
        {label}
      </p>
    </div>
  );
}

function projectStat(project: OssProject, stats: OssStats): string | null {
  if (!project.path) {
    const stars = stats.stars[project.repo];
    if (stars) return `${formatCompact(stars)} stars`;
  }
  if (project.npm) {
    const weekly = stats.weekly[project.npm];
    if (weekly) return `${formatCompact(weekly)} /wk`;
  }
  return null;
}

function ProjectRow({
  project,
  stats,
}: {
  project: OssProject;
  stats: OssStats;
}) {
  const stat = projectStat(project, stats);
  const license = project.license ?? "—";
  const href = ossPrimaryUrl(project);
  const external = href.startsWith("http");
  const className =
    "group hover:bg-foreground/[0.025] -mx-2 flex flex-col gap-1 px-2 py-2.5 transition-colors md:grid md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_3.5rem_5.5rem] md:items-baseline md:gap-6";
  const content = (
    <>
      <span className="text-sm font-medium">
        {project.name}
        <ArrowUpRight className="ms-1.5 mb-0.5 inline size-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
      </span>
      <span className="text-muted-foreground text-sm leading-relaxed">
        {project.description}
      </span>
      <span className="text-muted-foreground/70 hidden font-mono text-[11px] tracking-wide md:block">
        {license}
      </span>
      <span className="text-muted-foreground/70 hidden text-right font-mono text-[11px] tracking-wide tabular-nums md:block">
        {stat ?? "—"}
      </span>
      <span className="text-muted-foreground/60 mt-0.5 font-mono text-[10px] tracking-wide md:hidden">
        {license}
        {stat ? ` · ${stat}` : ""}
      </span>
    </>
  );

  return external ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {content}
    </a>
  ) : (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

function groupByCategory(
  projects: OssProject[],
): Record<OssCategory, OssProject[]> {
  const result = {} as Record<OssCategory, OssProject[]>;
  for (const project of projects) {
    const list = result[project.category] ?? [];
    list.push(project);
    result[project.category] = list;
  }
  return result;
}
