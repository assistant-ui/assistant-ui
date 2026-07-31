import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  OSS_CATEGORIES,
  OSS_PROJECTS,
  fetchOssStats,
  ossPrimaryUrl,
  type OssCategory,
  type OssProject,
  type OssStats,
} from "@/lib/oss";
import { formatCompact } from "@/lib/format";
import { createOgMetadata } from "@/lib/og";

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

  const grouped = groupByCategory(OSS_PROJECTS);
  const visibleCategories = (
    Object.keys(OSS_CATEGORIES) as OssCategory[]
  ).filter((category) => (grouped[category]?.length ?? 0) > 0);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pt-20 pb-32 md:pt-32">
      <header className="max-w-3xl">
        <h1 className="text-4xl font-medium tracking-tight text-balance md:text-6xl">
          Everything we build, in the open.
        </h1>
        <p className="text-muted-foreground mt-6 max-w-2xl text-lg leading-relaxed md:text-xl">
          {OSS_PROJECTS.length} projects across the assistant-ui organization,
          from the chat runtime to the primitives we extracted along the way.
        </p>
      </header>

      <div className="mt-24 flex flex-col gap-16 md:mt-32">
        {visibleCategories.map((category) => (
          <section
            key={category}
            className="md:grid md:grid-cols-[180px_minmax(0,1fr)] md:gap-12"
          >
            <h2 className="text-muted-foreground mb-4 text-sm md:mb-0 md:pt-5">
              {OSS_CATEGORIES[category].label}
            </h2>
            <div className="flex flex-col">
              {grouped[category]!.map((project) => (
                <ProjectRow key={project.id} project={project} stats={stats} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-32">
        <Link
          href="/packages"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          Every package we publish on npm
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </footer>
    </main>
  );
}

function ProjectRow({
  project,
  stats,
}: {
  project: OssProject;
  stats: OssStats;
}) {
  const stars = project.path ? 0 : (stats.stars[project.repo] ?? 0);
  const weekly = project.npm ? (stats.weekly[project.npm] ?? 0) : 0;
  const stat =
    stars > 0
      ? `${formatCompact(stars)} stars`
      : weekly > 0
        ? `${formatCompact(weekly)} / week`
        : null;

  const href = ossPrimaryUrl(project);
  const external = href.startsWith("http");
  const className =
    "group hover:bg-muted/40 -mx-3 flex flex-col gap-1 rounded-lg px-3 py-5 transition-colors md:flex-row md:items-baseline md:gap-8";
  const content = (
    <>
      <span className="flex items-center gap-1.5 font-medium md:w-72 md:flex-shrink-0">
        {project.name}
        <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
      </span>
      <span className="text-muted-foreground flex-1 text-sm md:text-base">
        {project.description}
      </span>
      {stat ? (
        <span className="text-muted-foreground/60 text-sm tabular-nums">
          {stat}
        </span>
      ) : null}
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
