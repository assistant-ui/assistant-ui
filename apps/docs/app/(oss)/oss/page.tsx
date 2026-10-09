import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import {
  OSS_PROJECTS,
  fetchOssStats,
  ossDestinations,
  type OssProject,
  type OssStats,
} from "@/lib/oss";
import { formatCompact } from "@/lib/format";
import { createOgMetadata } from "@/lib/og";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";

const title = "Open Source Projects";
const description =
  "Every open source project from the assistant-ui organization, with links to its docs, source, and packages.";

export const metadata: Metadata = {
  title,
  description,
  ...createOgMetadata(title, description),
};

async function getOssStats() {
  "use cache";
  cacheLife("hours");
  return fetchOssStats();
}

export default async function OssPage() {
  const stats = await getOssStats();

  const flagship = OSS_PROJECTS.find((project) => project.tier === "flagship");
  const major = OSS_PROJECTS.filter((project) => project.tier === "major");
  const minor = OSS_PROJECTS.filter((project) => project.tier === "minor");

  return (
    <PageFrame pad="sub">
      <header className="max-w-2xl">
        <h1 className={typePage}>{title}</h1>
        <p className={cn(typeDeck, "mt-3")}>
          Everything we build in the open, from the core SDK to the small
          packages we extracted along the way.
        </p>
      </header>

      {flagship ? <FlagshipCard project={flagship} stats={stats} /> : null}

      {major.length > 0 ? (
        <section aria-label="Projects" className="mt-4">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {major.map((project) => (
              <li key={project.id}>
                <ProjectCard project={project} stats={stats} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {minor.length > 0 ? (
        <section aria-label="More projects" className="mt-16 md:mt-20">
          <ul className="flex flex-col">
            {minor.map((project) => (
              <li key={project.id}>
                <ProjectRow project={project} stats={stats} />
              </li>
            ))}
          </ul>
        </section>
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

const cardSurface =
  "bg-foreground/[0.025] dark:bg-foreground/[0.04] hover:bg-foreground/[0.05] dark:hover:bg-foreground/[0.07] rounded-document transition-colors";

function FlagshipCard({
  project,
  stats,
}: {
  project: OssProject;
  stats: OssStats;
}) {
  const stars = stats.stars[project.repo];
  const weekly = project.npm ? stats.weekly[project.npm] : undefined;

  return (
    <section aria-label={`${project.name} project`} className="mt-10 md:mt-14">
      <Link
        href="/"
        aria-label={`${project.name} homepage`}
        className={cn(
          cardSurface,
          "group grid overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]",
        )}
      >
        <div className="flex flex-col justify-between gap-10 p-6 sm:p-8 lg:p-12">
          <div>
            {/* Proportions from /brand/logotype.svg: the mark is 1.6x the
                wordmark's ink height, with a 0.72x gap. In em so it scales. */}
            <div className="flex items-center gap-[0.525em] text-[2rem] lg:text-[2.75rem]">
              <Image
                src="/favicon/icon.svg"
                alt=""
                width={48}
                height={48}
                className="size-[1.22em] shrink-0 dark:hue-rotate-180 dark:invert"
              />
              <h2 className="font-display leading-none font-[550] tracking-[-0.015em]">
                {project.name}
              </h2>
            </div>
            <p className="text-muted-foreground mt-5 max-w-[36ch] text-[17px] leading-relaxed text-pretty">
              {project.description}
            </p>
          </div>

          <div className="flex flex-col gap-6">
            {stars || weekly ? (
              <dl className="flex flex-wrap gap-x-12 gap-y-6">
                {stars ? (
                  <div>
                    <dt className="text-muted-foreground flex items-baseline gap-2 text-sm">
                      {/* A round mark overshoots the baseline and cap height
                          equally, so center the circle on the caps. */}
                      <Image
                        src="/icons/github.svg"
                        alt=""
                        width={16}
                        height={16}
                        className="shrink-0 translate-y-[18%] opacity-70 dark:invert"
                      />
                      GitHub stars
                    </dt>
                    <dd className="font-display mt-2 text-[1.75rem] leading-none font-[550] tabular-nums">
                      {formatCompact(stars)}
                    </dd>
                  </div>
                ) : null}
                {weekly ? (
                  <div>
                    <dt className="text-muted-foreground flex items-baseline gap-2 text-sm">
                      {/* The wordmark sits on y=200 of 250; the "p" descender is the
                          bottom 20%, so shift it down that much to share the text baseline. */}
                      <svg
                        aria-hidden
                        viewBox="0 0 780 250"
                        width={40.56}
                        height={13}
                        fill="currentColor"
                        className="shrink-0 translate-y-[20%]"
                      >
                        <path d="M240 250h100v-50h100V0H240v250Zm100-200h50v100h-50V50ZM480 0v200h100V50h50v150h50V50h50v150h50V0H480ZM0 200h100V50h50v150h50V0H0v200Z" />
                      </svg>
                      Weekly downloads
                    </dt>
                    <dd className="font-display mt-2 text-[1.75rem] leading-none font-[550] tabular-nums">
                      {formatCompact(weekly)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </div>
        </div>

        <div className="border-foreground/[0.06] flex items-center border-t p-4 sm:p-8 lg:border-t-0 lg:border-l lg:p-10">
          <Image
            src="/illustrations/assistant-ui-preview.svg"
            alt="assistant-ui conversation showing quarterly sales with a revenue table"
            width={960}
            height={540}
            priority
            sizes="(max-width: 1024px) calc(100vw - 64px), 680px"
            className="rounded-document w-full [color-scheme:light] shadow-sm transition-transform duration-500 group-hover:scale-[1.01] dark:[color-scheme:dark]"
          />
        </div>
      </Link>
    </section>
  );
}

function ProjectCard({
  project,
  stats,
}: {
  project: OssProject;
  stats: OssStats;
}) {
  const stat = projectStat(project, stats);
  const destinations = ossDestinations(project);
  const primary = destinations.find((destination) => destination.isPrimary)!;
  const external = primary.href.startsWith("http");
  const titleClassName =
    "after:rounded-document after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4";

  return (
    <div
      className={cn(
        cardSurface,
        "group relative flex h-full flex-col p-5 sm:min-h-52 sm:p-6",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-medium tracking-[-0.01em]">
          {external ? (
            <a
              href={primary.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={primary.ariaLabel}
              className={titleClassName}
            >
              {project.name}
            </a>
          ) : (
            <Link
              href={primary.href}
              aria-label={primary.ariaLabel}
              className={titleClassName}
            >
              {project.name}
            </Link>
          )}
        </h3>
        <ArrowUpRight className="text-muted-foreground mt-1 size-4 shrink-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
      </div>
      <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed text-pretty">
        {project.description}
      </p>
      {stat ? (
        <span className="text-muted-foreground/70 mt-4 text-xs tabular-nums sm:mt-6">
          {stat}
        </span>
      ) : null}
    </div>
  );
}

function projectStatParts(
  project: OssProject,
  stats: OssStats,
): { value: string; unit: string } | null {
  if (!project.path) {
    const stars = stats.stars[project.repo];
    if (stars) return { value: formatCompact(stars), unit: "stars" };
  }
  if (project.npm) {
    const weekly = stats.weekly[project.npm];
    if (weekly) return { value: formatCompact(weekly), unit: "/wk" };
  }
  return null;
}

function projectStat(project: OssProject, stats: OssStats): string | null {
  const parts = projectStatParts(project, stats);
  return parts ? `${parts.value} ${parts.unit}` : null;
}

function ProjectRow({
  project,
  stats,
}: {
  project: OssProject;
  stats: OssStats;
}) {
  const stat = projectStatParts(project, stats);
  const primary = ossDestinations(project).find(
    (destination) => destination.isPrimary,
  )!;
  const external = primary.href.startsWith("http");
  const titleClassName =
    "after:rounded-document after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4";
  const name = (
    <span
      className={cn(
        project.npm === project.name &&
          "font-mono [font-variant-ligatures:none]",
      )}
    >
      {project.name}
    </span>
  );

  return (
    <div className="group hover:bg-foreground/[0.025] rounded-document relative -mx-4 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-8 gap-y-1 px-4 py-5 transition-colors md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_8rem]">
      <h3 className="flex items-center gap-1.5 text-lg font-medium">
        {external ? (
          <a
            href={primary.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={primary.ariaLabel}
            className={titleClassName}
          >
            {name}
          </a>
        ) : (
          <Link
            href={primary.href}
            aria-label={primary.ariaLabel}
            className={titleClassName}
          >
            {name}
          </Link>
        )}
        <ArrowUpRight className="text-muted-foreground size-4 shrink-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
      </h3>
      <p className="text-muted-foreground col-span-2 row-start-2 text-sm md:col-span-1 md:row-start-auto">
        {project.description}
      </p>
      <p className="font-display text-right text-xl font-[550] tabular-nums">
        {stat ? (
          <>
            {stat.value}
            <span className="text-muted-foreground ms-1 text-xs font-normal">
              {stat.unit}
            </span>
          </>
        ) : null}
      </p>
    </div>
  );
}
